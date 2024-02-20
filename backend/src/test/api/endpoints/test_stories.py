import pytest
from fastapi.testclient import TestClient


def test_project_add_user(client: TestClient, api_user, api_project) -> None:
    alice = api_user.create("alice")
    bob = api_user.create("bob")

    project1 = api_project.create(alice, "project1")
    project2 = api_project.create(bob, "project2")

    # Alice adds Bob to project1
    response_add_p1_bob = client.patch(
        f"/project/{project1['id']}/user/{bob['id']}", headers=alice["AuthHeader"]
    )
    assert response_add_p1_bob.status_code == 200

    # Alice updates project2 details - failure
    response_update_p2_alice_failure = client.patch(
        f"/project/{project2['id']}",
    )
    response_update_p2.status_code == 200


def test_user_update_remove(client: TestClient, api_user) -> None:
    charlie = api_user.create("charlie")

    # Charlie updates details of user charlie
    update_charlie = {
        "email": "bender@ilovebender.com",
        "first_name": "I.C.",
        "last_name": "Weiner",
        "password": "1077",
    }
    response_update_charlie = client.patch(
        f"/user/{charlie['id']}", headers=charlie["AuthHeader"], json=update_charlie
    )
    assert response_update_charlie.status_code == 200

    # Charlie removes user charlie - failure (changed email)
    response_remove_charlie_failure = client.delete(
        f"/user/{charlie['id']}", headers=charlie["AuthHeader"]
    )
    assert response_remove_charlie_failure.status_code == 404

    # Charlie relogins
    relogin_charlie = {
        "username": update_charlie["email"],
        "password": update_charlie["password"],
    }
    response_relogin_charlie = client.post(
        "/authentication/login", data=relogin_charlie
    ).json()
    charlie["AuthHeader"] = {
        "Authorization": f"{response_relogin_charlie['token_type']} {response_relogin_charlie['access_token']}"
    }

    # Charlie removes user charlie
    response_remove_charlie = client.delete(
        f"/user/{charlie['id']}", headers=charlie["AuthHeader"]
    )
    assert response_remove_charlie.status_code == 200


@pytest.mark.order(after="test_project_add_user")
def test_codes_create(client: TestClient, api_user, api_project, api_code) -> None:
    project1 = api_project.projectList["project1"]
    project2 = api_project.projectList["project2"]

    alice = api_user.userList["alice"]
    bob = api_user.userList["bob"]

    # Alice creates three codes in project1
    response_codes_project1_before = client.get(
        f"/project/{project1['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_before = len(response_codes_project1_before)

    _ = api_code.create("code1", alice, project1)
    _ = api_code.create("code2", alice, project1)
    _ = api_code.create("code3", alice, project1)

    response_codes_project1_after = client.get(
        f"/project/{project1['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_after = len(response_codes_project1_after)

    assert codes_project1_before + 3 == codes_project1_after

    # Bob creates three codes in project2
    response_codes_project2_before = client.get(
        f"/project/{project2['id']}/code", headers=bob["AuthHeader"]
    ).json()
    codes_project2_before = len(response_codes_project2_before)
    _ = api_code.create("code4", bob, project2)
    _ = api_code.create("code5", bob, project2)
    _ = api_code.create("code6", bob, project2)

    response_codes_project2_after = client.get(
        f"/project/{project2['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project2_after = len(response_codes_project2_after)

    assert codes_project2_before + 3 == codes_project2_after


@pytest.mark.order(after="test_project_add_user")
def test_upload_documents(client, api_user, api_project, api_document) -> None:
    import time

    alice = api_user.userList["alice"]
    project1 = api_project.projectList["project1"]

    # Alice uploads two text documents to project1
    # https://de.wikipedia.org/wiki/Erde
    text_doc1 = ("https://de.wikipedia.org/wiki/Erde", "Erde – Wikipedia.html")
    # https://de.wikipedia.org/wiki/Ferae
    text_doc2 = ("https://de.wikipedia.org/wiki/Ferae", "Ferae – Wikipedia.html")
    text_response12 = api_document.create([text_doc1, text_doc2], alice, project1)

    text1_prepro_job_id = text_response12[text_doc1[1]]["prepro_job_id"]
    text2_prepro_job_id = text_response12[text_doc2[1]]["prepro_job_id"]

    text1_prepro_status = api_document.prepro_status(text1_prepro_job_id, alice)
    text2_prepro_status = api_document.prepro_status(text2_prepro_job_id, alice)
    while text1_prepro_status == "Running" or text2_prepro_status == "Running":
        text1_prepro_status = api_document.prepro_status(text1_prepro_job_id, alice)
        text2_prepro_status = api_document.prepro_status(text2_prepro_job_id, alice)
        time.sleep(2)
    assert text1_prepro_status == "Finished"
    assert text2_prepro_status == "Finished"

    api_document.get_sdoc_id(text_doc1[1], alice)
    api_document.get_sdoc_id(text_doc2[1], alice)

    # Alice uploads two image documents to project1
    # https://commons.wikimedia.org/wiki/File:GG1949.png
    image_doc1 = (
        "https://upload.wikimedia.org/wikipedia/commons/7/78/GG1949.png",
        "GG1949.png",
    )
    # https://commons.wikimedia.org/wiki/File:Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG
    image_doc2 = (
        "https://upload.wikimedia.org/wikipedia/commons/6/68/Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
        "Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
    )

    image_response12 = api_document.create([image_doc1, image_doc2], alice, project1)
    image1_prepro_job_id = image_response12[image_doc1[1]]["prepro_job_id"]
    image2_prepro_job_id = image_response12[image_doc2[1]]["prepro_job_id"]

    image1_prepro_status = api_document.prepro_status(image1_prepro_job_id, alice)
    image2_prepro_status = api_document.prepro_status(image2_prepro_job_id, alice)
    while image1_prepro_status == "Running" or image2_prepro_status == "Running":
        image1_prepro_status = api_document.prepro_status(image1_prepro_job_id, alice)
        image2_prepro_status = api_document.prepro_status(image2_prepro_job_id, alice)
        time.sleep(2)
    assert image1_prepro_status == "Finished"
    assert image2_prepro_status == "Finished"

    api_document.get_sdoc_id(image_doc1[1], alice)
    api_document.get_sdoc_id(image_doc2[1], alice)

    # Upload video to project1
    # https://commons.wikimedia.org/wiki/File:Welche_Form_hat_das_Universum%3F.webm
    video_doc1 = (
        "https://upload.wikimedia.org/wikipedia/commons/1/18/Welche_Form_hat_das_Universum%3F.webm",
        "Welche_Form_hat_das_Universum%3F.webm",
    )

    # https://commons.wikimedia.org/wiki/File:Lurraren_ilargiak.webm
    video_doc2 = (
        "https://upload.wikimedia.org/wikipedia/commons/b/b7/Lurraren_ilargiak.webm",
        "Lurraren_ilargiak.webm",
    )

    video_response12 = api_document.create([video_doc1, video_doc2], alice, project1)
    video1_prepro_job_id = video_response12[video_doc1[1]]["prepro_job_id"]
    video2_prepro_job_id = video_response12[video_doc2[1]]["prepro_job_id"]

    video1_propro_status = api_document.prepro_status(video1_prepro_job_id, alice)
    video2_prepro_status = api_document.prepro_status(video2_prepro_job_id, alice)
    while video1_propro_status == "Running" or video2_prepro_status == "Running":
        video1_propro_status = api_document.prepro_status(video1_prepro_job_id, alice)
        video2_prepro_status = api_document.prepro_status(video2_prepro_job_id, alice)
        time.sleep(1)
    assert video1_propro_status == "Finished"
    assert video2_prepro_status == "Finished"

    api_document.get_sdoc_id(video_doc1[1], alice)
    api_document.get_sdoc_id(video_doc2[1], alice)

    # Upload audio to project1
    # https://commons.wikimedia.org/wiki/File:Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg
    audio_doc1 = (
        "https://upload.wikimedia.org/wikipedia/commons/4/4c/Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg",
        "Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg",
    )

    # https://commons.wikimedia.org/wiki/File:Nl-Zandvoort_(Gelderland)-article.ogg
    audio_doc2 = (
        "https://upload.wikimedia.org/wikipedia/commons/e/e1/Nl-Zandvoort_%28Gelderland%29-article.ogg",
        "Nl-Zandvoort_%28Gelderland%29-article.ogg",
    )

    audio_response12 = api_document.create([audio_doc1, audio_doc2], alice, project1)
    audio1_prepro_job_id = audio_response12[audio_doc1[1]]["prepro_job_id"]
    audio2_prepro_job_id = audio_response12[audio_doc2[1]]["prepro_job_id"]

    audio1_prepro_status = api_document.prepro_status(audio1_prepro_job_id, alice)
    audio2_prepro_status = api_document.prepro_status(audio2_prepro_job_id, alice)
    while audio1_prepro_status == "Running" or audio2_prepro_status == "Running":
        audio1_prepro_status = api_document.prepro_status(audio1_prepro_job_id, alice)
        audio2_prepro_status = api_document.prepro_status(audio2_prepro_job_id, alice)
        time.sleep(2)
    assert audio1_prepro_status == "Finished"
    assert audio2_prepro_status == "Finished"

    api_document.get_sdoc_id(audio_doc1[1], alice)
    api_document.get_sdoc_id(audio_doc2[1], alice)

    bob = api_user.userList["bob"]
    project2 = api_project.projectList["project2"]

    # Upload text to project2
    # https://de.wikipedia.org/wiki/Mars_(Planet)
    text_doc3 = (
        "https://de.wikipedia.org/wiki/Mars_(Planet)",
        "Mars (Planet) – Wikipedia.html",
    )
    # https://de.wikipedia.org/wiki/Otter
    text_doc4 = ("https://de.wikipedia.org/wiki/Otter", "Otter – Wikipedia.html")
    text_response34 = api_document.create([text_doc3, text_doc4], bob, project2)

    text3_prepro_job_id = text_response34[text_doc3[1]]["prepro_job_id"]
    text4_prepro_job_id = text_response34[text_doc4[1]]["prepro_job_id"]

    text3_prepro_status = api_document.prepro_status(text3_prepro_job_id, bob)
    text4_prepro_status = api_document.prepro_status(text4_prepro_job_id, bob)
    while text3_prepro_status == "Running" or text4_prepro_status == "Running":
        text3_prepro_status = api_document.prepro_status(text3_prepro_job_id, bob)
        text4_prepro_status = api_document.prepro_status(text4_prepro_job_id, bob)
        time.sleep(2)
    assert text3_prepro_status == "Finished"
    assert text4_prepro_status == "Finished"

    api_document.get_sdoc_id(text_doc3[1], bob)
    api_document.get_sdoc_id(text_doc4[1], bob)

    # Upload image to project2
    # https://upload.wikimedia.org/wikipedia/commons/4/41/Space_Shuttle_Columbia_launching.jpg
    image_doc3 = (
        "https://upload.wikimedia.org/wikipedia/commons/4/41/Space_Shuttle_Columbia_launching.jpg",
        "Space_Shuttle_Columbia_launching.jpg",
    )
    # https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg
    image_doc4 = (
        "https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    )

    image_response34 = api_document.create([image_doc3, image_doc4], bob, project2)
    image3_prepro_job_id = image_response34[image_doc3[1]]["prepro_job_id"]
    image4_prepro_job_id = image_response34[image_doc4[1]]["prepro_job_id"]

    image3_prepro_status = api_document.prepro_status(image3_prepro_job_id, bob)
    image4_prepro_status = api_document.prepro_status(image4_prepro_job_id, bob)
    while image3_prepro_status == "Running" or image4_prepro_status == "Running":
        image3_prepro_status = api_document.prepro_status(image3_prepro_job_id, bob)
        image4_prepro_status = api_document.prepro_status(image4_prepro_job_id, bob)
        time.sleep(2)
    assert image3_prepro_status == "Finished"
    assert image4_prepro_status == "Finished"

    api_document.get_sdoc_id(image_doc3[1], bob)
    api_document.get_sdoc_id(image_doc4[1], bob)

    # Upload video to project2
    # https://upload.wikimedia.org/wikipedia/commons/6/64/2012-07-18_Market_Street_-_San_Francisco.webm
    video_doc3 = (
        "https://upload.wikimedia.org/wikipedia/commons/6/64/2012-07-18_Market_Street_-_San_Francisco.webm",
        "2012-07-18_Market_Street_-_San_Francisco.webm",
    )

    # https://upload.wikimedia.org/wikipedia/commons/8/87/Schlossbergbahn.webm
    video_doc4 = (
        "https://upload.wikimedia.org/wikipedia/commons/8/87/Schlossbergbahn.webm",
        "Schlossbergbahn.webm",
    )

    video_response34 = api_document.create([video_doc3, video_doc4], bob, project2)
    video3_prepro_job_id = video_response34[video_doc3[1]]["prepro_job_id"]
    video4_prepro_job_id = video_response34[video_doc4[1]]["prepro_job_id"]

    video3_prepro_status = api_document.prepro_status(video3_prepro_job_id, bob)
    video4_prepro_status = api_document.prepro_status(video4_prepro_job_id, bob)
    while video3_prepro_status == "Running" or video4_prepro_status == "Running":
        video3_prepro_status = api_document.prepro_status(video3_prepro_job_id, bob)
        video4_prepro_status = api_document.prepro_status(video4_prepro_job_id, bob)
        time.sleep(1)
    assert video3_prepro_status == "Finished"
    assert video4_prepro_status == "Finished"

    api_document.get_sdoc_id(video_doc3[1], bob)
    api_document.get_sdoc_id(video_doc4[1], bob)

    # Upload audio to project2
    # https://librivox.org/coffee-break-collection-25-water-by-various/
    audio_doc3 = (
        "https://ia903105.us.archive.org/34/items/cb025_1911_librivox/cb25_09_various_128kb.mp3",
        "cb25_09_various_128kb.mp3",
    )

    # https://ia803203.us.archive.org/0/items/sammlung_gedicht_012_librivox/deutschegedichte012_08_thule_lis.mp3
    audio_doc4 = (
        "https://ia803203.us.archive.org/0/items/sammlung_gedicht_012_librivox/deutschegedichte012_08_thule_lis.mp3",
        "deutschegedichte012_08_thule_lis.mp3",
    )

    audio_response34 = api_document.create([audio_doc3, audio_doc4], bob, project2)
    audio3_prepro_job_id = audio_response34[audio_doc3[1]]["prepro_job_id"]
    audio4_prepro_job_id = audio_response34[audio_doc4[1]]["prepro_job_id"]

    audio3_prepro_status = api_document.prepro_status(audio3_prepro_job_id, bob)
    audio4_prepro_status = api_document.prepro_status(audio4_prepro_job_id, bob)
    while audio3_prepro_status == "Running" or audio4_prepro_status == "Running":
        audio3_prepro_status = api_document.prepro_status(audio3_prepro_job_id, bob)
        audio4_prepro_status = api_document.prepro_status(audio4_prepro_job_id, bob)
        time.sleep(2)
    assert audio3_prepro_status == "Finished"
    assert audio4_prepro_status == "Finished"

    api_document.get_sdoc_id(audio_doc3[1], bob)
    api_document.get_sdoc_id(audio_doc4[1], bob)


@pytest.mark.order(after="test_project_add_user")
def test_project_memos(client, api_user, api_project):
    alice = api_user.userList["alice"]
    project1 = api_project.projectList["project1"]
    project_memo = {
        "title": "This is a memo",
        "content": "containing informations",
        "user_id": alice["id"],
        "project_id": project1["id"],
        "starred": True,
    }
    memo_response = client.put(
        f"project/{project1['id']}/memo", headers=alice["AuthHeader"], json=project_memo
    )
    assert memo_response.status_code == 200

    memo_get = client.get(
        f"project/{project1['id']}/memo", headers=alice["AuthHeader"]
    ).json()[0]
    assert memo_get["title"] == project_memo["title"]
    assert memo_get["content"] == project_memo["content"]
    assert memo_get["id"] == memo_response.json()["id"]
    assert memo_get["starred"] == project_memo["starred"]
    assert memo_get["user_id"] == project_memo["user_id"]
    assert memo_get["project_id"] == project_memo["project_id"]


@pytest.mark.order(after="test_upload_documents")
def test_annotate_sdoc(client, api_user, api_document) -> None:
    alice = api_user.userList["alice"]
    text_doc1 = api_document.documentList["Erde – Wikipedia.html"]
    adoc_create1 = {"source_document_id": text_doc1["sdoc_id"], "user_id": alice["id"]}
    adoc_response1 = client.put(
        "adoc", headers=alice["AuthHeader"], json=adoc_create1
    ).json()
    # Alice creates two annotations for Textdoc1
    span1_annotation = {
        "begin": 0,
        "end": 20,
        "begin_token": 0,
        "end_token": 4,
        "span_text": "test",
        "code_id": 5,
        "annotation_document_id": adoc_response1["id"],
    }
    span1_response = client.put(
        "span", headers=alice["AuthHeader"], json=span1_annotation
    )
    assert span1_response.status_code == 200
    span1_response = span1_response.json()
    assert span1_annotation["begin"] == span1_response["begin"]
    assert span1_annotation["end"] == span1_response["end"]
    assert span1_annotation["begin_token"] == span1_response["begin_token"]
    assert span1_annotation["end_token"] == span1_response["end_token"]
    assert (
        span1_annotation["annotation_document_id"]
        == span1_response["annotation_document_id"]
    )
    assert alice["id"] == span1_response["user_id"]
    assert text_doc1["sdoc_id"] == span1_response["sdoc_id"]

    span2_annotation = {
        "begin": 5,
        "end": 25,
        "begin_token": 3,
        "end_token": 10,
        "span_text": "new test",
        "code_id": 6,
        "annotation_document_id": adoc_response1["id"],
    }
    span2_response = client.put(
        "span", headers=alice["AuthHeader"], json=span2_annotation
    )
    assert span2_response.status_code == 200
    span2_response = span2_response.json()
    assert span2_annotation["begin"] == span2_response["begin"]
    assert span2_annotation["end"] == span2_response["end"]
    assert span2_annotation["begin_token"] == span2_response["begin_token"]
    assert span2_annotation["end_token"] == span2_response["end_token"]
    assert (
        span2_annotation["annotation_document_id"]
        == span2_response["annotation_document_id"]
    )
    assert alice["id"] == span2_response["user_id"]
    assert text_doc1["sdoc_id"] == span2_response["sdoc_id"]

    span_annos1 = client.get(
        f"adoc/{adoc_response1['id']}/span_annotations", headers=alice["AuthHeader"]
    ).json()
    assert len(span_annos1) == 2

    # Alice creates an annotation for Textdoc2
    text_doc2 = api_document.documentList["Ferae – Wikipedia.html"]
    adoc_create2 = {"source_document_id": text_doc2["sdoc_id"], "user_id": alice["id"]}
    adoc_response2 = client.put(
        "adoc", headers=alice["AuthHeader"], json=adoc_create2
    ).json()
    span3_annotation = {
        "begin": 20,
        "end": 40,
        "begin_token": 2,
        "end_token": 9,
        "span_text": "new test",
        "code_id": 6,
        "annotation_document_id": adoc_response2["id"],
    }
    span3_response = client.put(
        "span", headers=alice["AuthHeader"], json=span3_annotation
    )
    assert span3_response.status_code == 200
    span3_response = span3_response.json()
    assert span3_annotation["begin"] == span3_response["begin"]
    assert span3_annotation["end"] == span3_response["end"]
    assert span3_annotation["begin_token"] == span3_response["begin_token"]
    assert span3_annotation["end_token"] == span3_response["end_token"]
    assert (
        span3_annotation["annotation_document_id"]
        == span3_response["annotation_document_id"]
    )
    assert alice["id"] == span3_response["user_id"]
    assert text_doc2["sdoc_id"] == span3_response["sdoc_id"]

    span_annos2 = client.get(
        f"adoc/{adoc_response2['id']}/span_annotations", headers=alice["AuthHeader"]
    ).json()
    assert len(span_annos2) == 1

    # Bob creates two annotations for Textdoc1
    bob = api_user.userList["bob"]
    text_doc1 = api_document.documentList["Erde – Wikipedia.html"]
    span4_annotation = {
        "begin": 0,
        "end": 10,
        "begin_token": 0,
        "end_token": 2,
        "span_text": "test Span",
        "code_id": 2,
        "annotation_document_id": adoc_response1["id"],
    }
    span4_response = client.put(
        "span", headers=bob["AuthHeader"], json=span4_annotation
    )
    assert span4_response.status_code == 200
    span4_response = span4_response.json()
    assert span4_annotation["begin"] == span4_response["begin"]
    assert span4_annotation["end"] == span4_response["end"]
    assert span4_annotation["begin_token"] == span4_response["begin_token"]
    assert span4_annotation["end_token"] == span4_response["end_token"]
    assert (
        span4_annotation["annotation_document_id"]
        == span4_response["annotation_document_id"]
    )
    # assert bob["id"] == span4_response["user_id"] # TODO: https://github.com/uhh-lt/dwts/issues/362
    assert text_doc1["sdoc_id"] == span4_response["sdoc_id"]

    span5_annotation = {
        "begin": 15,
        "end": 40,
        "begin_token": 10,
        "end_token": 15,
        "span_text": "fith annotation",
        "code_id": 10,
        "annotation_document_id": adoc_response1["id"],
    }
    span5_response = client.put(
        "span", headers=bob["AuthHeader"], json=span5_annotation
    )
    assert span5_response.status_code == 200
    span5_response = span5_response.json()
    assert span5_annotation["begin"] == span5_response["begin"]
    assert span5_annotation["end"] == span5_response["end"]
    assert span5_annotation["begin_token"] == span5_response["begin_token"]
    assert span5_annotation["end_token"] == span5_response["end_token"]
    assert (
        span5_annotation["annotation_document_id"]
        == span5_response["annotation_document_id"]
    )
    # assert bob["id"] == span5_response["user_id"] # TODO: https://github.com/uhh-lt/dwts/issues/362
    assert text_doc1["sdoc_id"] == span5_response["sdoc_id"]

    span_annos1 = client.get(
        f"adoc/{adoc_response1['id']}/span_annotations", headers=bob["AuthHeader"]
    ).json()
    assert len(span_annos1) == 4

    # Bob creates an annotation for Textdoc2
    span6_annotation = {
        "begin": 3,
        "end": 30,
        "begin_token": 2,
        "end_token": 20,
        "span_text": "last annotation",
        "code_id": 1,
        "annotation_document_id": adoc_response2["id"],
    }
    span6_response = client.put(
        "span", headers=bob["AuthHeader"], json=span6_annotation
    )
    assert span6_response.status_code == 200
    span6_response = span6_response.json()
    assert span6_annotation["begin"] == span6_response["begin"]
    assert span6_annotation["end"] == span6_response["end"]
    assert span6_annotation["begin_token"] == span6_response["begin_token"]
    assert span6_annotation["end_token"] == span6_response["end_token"]
    assert (
        span6_annotation["annotation_document_id"]
        == span6_response["annotation_document_id"]
    )
    # assert bob["id"] == span6_response["user_id"] # TODO: https://github.com/uhh-lt/dwts/issues/362
    assert text_doc2["sdoc_id"] == span6_response["sdoc_id"]

    span_annos2 = client.get(
        f"adoc/{adoc_response2['id']}/span_annotations", headers=bob["AuthHeader"]
    ).json()
    assert len(span_annos2) == 2

    # Bob removes the span annotations for Textdoc2
    textdoc2_spananno_clear = client.delete(
        f"adoc/{adoc_response2['id']}/span_annotations", headers=bob["AuthHeader"]
    )
    assert textdoc2_spananno_clear.status_code == 200

    textdoc2_spananno_clear = client.get(
        f"adoc/{adoc_response2['id']}/span_annotations", headers=bob["AuthHeader"]
    ).json()
    assert len(textdoc2_spananno_clear) == 0


@pytest.mark.order(after="test_upload_documents")
def test_bbox_annotatation(client, api_user, api_document) -> None:
    alice = api_user.userList["alice"]
    image_doc1 = api_document.documentList["GG1949.png"]
    # Alice creates an annotation document
    adoc_create1 = {"source_document_id": image_doc1["sdoc_id"], "user_id": alice["id"]}
    adoc_response1 = client.put(
        "adoc", headers=alice["AuthHeader"], json=adoc_create1
    ).json()
    # Alice creates two image annotations for Imagedoc1
    bbox_annotation1 = {
        "x_min": 0,
        "x_max": 10,
        "y_min": 0,
        "y_max": 25,
        "code_id": 4,
        "annotation_document_id": adoc_response1["id"],
    }
    bbox_response1 = client.put(
        "bbox", headers=alice["AuthHeader"], json=bbox_annotation1
    )
    assert bbox_response1.status_code == 200
    bbox_response1 = bbox_response1.json()
    assert bbox_response1["x_min"] == bbox_annotation1["x_min"]
    assert bbox_response1["x_max"] == bbox_annotation1["x_max"]
    assert bbox_response1["y_min"] == bbox_annotation1["y_min"]
    assert bbox_response1["y_max"] == bbox_annotation1["y_max"]
    assert bbox_response1["code"]["id"] == bbox_annotation1["code_id"]
    assert (
        bbox_response1["annotation_document_id"]
        == bbox_annotation1["annotation_document_id"]
    )

    bbox_annotation2 = {
        "x_min": 30,
        "x_max": 90,
        "y_min": 20,
        "y_max": 50,
        "code_id": 2,
        "annotation_document_id": adoc_response1["id"],
    }
    bbox_response2 = client.put(
        "bbox", headers=alice["AuthHeader"], json=bbox_annotation2
    )
    assert bbox_response2.status_code == 200
    bbox_response2 = bbox_response2.json()
    assert bbox_response2["x_min"] == bbox_annotation2["x_min"]
    assert bbox_response2["x_max"] == bbox_annotation2["x_max"]
    assert bbox_response2["y_min"] == bbox_annotation2["y_min"]
    assert bbox_response2["y_max"] == bbox_annotation2["y_max"]
    assert bbox_response2["code"]["id"] == bbox_annotation2["code_id"]
    assert (
        bbox_response2["annotation_document_id"]
        == bbox_annotation2["annotation_document_id"]
    )

    bbox_annos1 = client.get(
        f"adoc/{adoc_response1['id']}/bbox_annotations", headers=alice["AuthHeader"]
    ).json()
    assert len(bbox_annos1) == 2

    # Bob creates an image annotation for Imagedoc1
    bob = api_user.userList["bob"]

    bbox_annotation3 = {
        "x_min": 12,
        "x_max": 22,
        "y_min": 7,
        "y_max": 700,
        "code_id": 6,
        "annotation_document_id": adoc_response1["id"],
    }
    bbox_response3 = client.put(
        "bbox", headers=bob["AuthHeader"], json=bbox_annotation3
    )
    assert bbox_response3.status_code == 200
    bbox_response3 = bbox_response3.json()
    assert bbox_response3["x_min"] == bbox_annotation3["x_min"]
    assert bbox_response3["x_max"] == bbox_annotation3["x_max"]
    assert bbox_response3["y_min"] == bbox_annotation3["y_min"]
    assert bbox_response3["y_max"] == bbox_annotation3["y_max"]
    assert bbox_response3["code"]["id"] == bbox_annotation3["code_id"]
    assert (
        bbox_response3["annotation_document_id"]
        == bbox_annotation3["annotation_document_id"]
    )

    bbox_annos1 = client.get(
        f"adoc/{adoc_response1['id']}/bbox_annotations", headers=bob["AuthHeader"]
    ).json()
    assert len(bbox_annos1) == 3

    # Bob creates an annotation document
    image_doc2 = api_document.documentList[
        "Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG"
    ]
    adoc_create2 = {"source_document_id": image_doc2["sdoc_id"], "user_id": alice["id"]}
    adoc_response2 = client.put(
        "adoc", headers=alice["AuthHeader"], json=adoc_create2
    ).json()

    # Bob creates two image annotations for Imagedoc2
    bbox_annotation4 = {
        "x_min": 39,
        "x_max": 390,
        "y_min": 700,
        "y_max": 701,
        "code_id": 9,
        "annotation_document_id": adoc_response2["id"],
    }
    bbox_response4 = client.put(
        "bbox", headers=bob["AuthHeader"], json=bbox_annotation4
    )
    assert bbox_response4.status_code == 200
    bbox_response4 = bbox_response4.json()
    assert bbox_response4["x_min"] == bbox_annotation4["x_min"]
    assert bbox_response4["x_max"] == bbox_annotation4["x_max"]
    assert bbox_response4["y_min"] == bbox_annotation4["y_min"]
    assert bbox_response4["y_max"] == bbox_annotation4["y_max"]
    assert bbox_response4["code"]["id"] == bbox_annotation4["code_id"]
    assert (
        bbox_response4["annotation_document_id"]
        == bbox_annotation4["annotation_document_id"]
    )

    bbox_annotation5 = {
        "x_min": 390,
        "x_max": 600,
        "y_min": 250,
        "y_max": 500,
        "code_id": 8,
        "annotation_document_id": adoc_response2["id"],
    }
    bbox_response5 = client.put(
        "bbox", headers=bob["AuthHeader"], json=bbox_annotation5
    )
    assert bbox_response5.status_code == 200
    bbox_response5 = bbox_response5.json()
    assert bbox_response5["x_min"] == bbox_annotation5["x_min"]
    assert bbox_response5["x_max"] == bbox_annotation5["x_max"]
    assert bbox_response5["y_min"] == bbox_annotation5["y_min"]
    assert bbox_response5["y_max"] == bbox_annotation5["y_max"]
    assert bbox_response5["code"]["id"] == bbox_annotation5["code_id"]
    assert (
        bbox_response5["annotation_document_id"]
        == bbox_annotation5["annotation_document_id"]
    )

    bbox_annos2 = client.get(
        f"adoc/{adoc_response2['id']}/bbox_annotations", headers=bob["AuthHeader"]
    ).json()
    assert len(bbox_annos2) == 2

    # Bob removes the image annotations for Imagedoc2
    imagedoc2_bbox_clear = client.delete(
        f"adoc/{adoc_response2['id']}/bbox_annotations", headers=bob["AuthHeader"]
    )
    assert imagedoc2_bbox_clear.status_code == 200

    bbox_annos2_clear = client.get(
        f"adoc/{adoc_response2['id']}/bbox_annotations", headers=bob["AuthHeader"]
    ).json()
    assert len(bbox_annos2_clear) == 0


@pytest.mark.order(after="test_project_add_user")
def test_feedback(client, api_user) -> None:
    alice = api_user.userList["alice"]
    bob = api_user.userList["bob"]
    feedback = {"user_content": "I really love this app!", "user_id": bob["id"]}
    # Alice creates feedback with bobs user id - fail
    response_fail = client.put("feedback", headers=alice["AuthHeader"], json=feedback)
    assert response_fail.status_code == 403
    # Bob creates feedback
    response_fail = client.put("feedback", headers=bob["AuthHeader"], json=feedback)
    assert response_fail.status_code == 200
