import pytest
from fastapi.testclient import TestClient

from app.core.data.dto.memo import AttachedObjectType

# The licence for the respective work is linked in the commentary
# https://commons.wikimedia.org/wiki/File:Armstrong_Small_Step.ogg
audio_doc1 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Armstrong_Small_Step.ogg",
    "Armstrong_Small_Step.ogg",
)

# https://commons.wikimedia.org/wiki/File:Kennedy_berliner.ogg
audio_doc2 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Kennedy_berliner.ogg",
    "Kennedy_berliner.ogg",
)

# https://commons.wikimedia.org/wiki/File:Alpine_specialty_by_George_P._Watson.mp3
audio_doc3 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Alpine_specialty_by_George_P._Watson.mp3",
    "Alpine_specialty_by_George_P._Watson.mp3",
)

# https://commons.wikimedia.org/wiki/File:Bluetooth.ogg
audio_doc4 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Bluetooth.ogg",
    "Bluetooth.ogg",
)

# https://commons.wikimedia.org/wiki/File:GG1949.png
image_doc1 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/737px-GG1949.png",
    "737px-GG1949.png",
)

# https://commons.wikimedia.org/wiki/File:Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG
image_doc2 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/640px-Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
    "640px-Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
)

# https://commons.wikimedia.org/wiki/File:Space_Shuttle_Columbia_launching.jpg
image_doc3 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/1024px-Space_Shuttle_Columbia_launching.jpg",
    "Space_Shuttle_Columbia_launching.jpg",
)
# https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg
image_doc4 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
)

# https://de.wikipedia.org/wiki/Turing-Test
text_doc1 = (
    "https://de.wikipedia.org/wiki/Turing-Test",
    "Turing-Test – Wikipedia.html",
)

# https://de.wikipedia.org/wiki/Ferae
text_doc2 = ("https://de.wikipedia.org/wiki/Ferae", "Ferae – Wikipedia.html")

# https://de.wikipedia.org/wiki/Hausapotheke
text_doc3 = (
    "https://de.wikipedia.org/wiki/Hausapotheke",
    "Hausapotheke – Wikipedia.html",
)
# https://de.wikipedia.org/wiki/Otter
text_doc4 = ("https://de.wikipedia.org/wiki/Otter", "Otter – Wikipedia.html")

# https://commons.wikimedia.org/wiki/File:Stephen_Amell_about_flashbacks_of_Arrow_at_NerdHQ_2014.webm
video_doc1 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Abertas_inscri%C3%A7%C3%B5es_para_pr%C3%AAmio_que_incentiva_projetos_ligados_a_arte_nas_ruas.webm",
    "Abertas_inscrições_para_prêmio_que_incentiva_projetos_ligados_a_arte_nas_ruas.webm",
)

# https://commons.wikimedia.org/wiki/File:Google_translate_accent_differences.mpg
video_doc2 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Google_translate_accent_differences.mpg.240p.vp9.webm",
    "Google_translate_accent_differences.mpg.240p.vp9.webm",
)

# https://upload.wikimedia.org/wikipedia/commons/6/64/2012-07-18_Market_Street_-_San_Francisco.webm
video_doc3 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/2012-07-18_Market_Street_-_San_Francisco.webm.480p.vp9.webm",
    "2012-07-18_Market_Street_-_San_Francisco.webm.480p.vp9.webm",
)

# https://commons.wikimedia.org/wiki/File:Schlossbergbahn.webm
video_doc4 = (
    "https://ltdata1.informatik.uni-hamburg.de/dats/Schlossbergbahn.webm.360p.webm",
    "Schlossbergbahn.webm.360p.webm",
)


def test_project_add_user(client: TestClient, api_user, api_project) -> None:
    alice = api_user.create("alice")
    bob = api_user.create("bob")

    project1 = api_project.create(alice, "project1")
    project2 = api_project.create(bob, "project2")

    # Alice adds Bob to project1
    response_add_p1_bob = client.patch(
        f"/project/{project1['id']}/user",
        json={
            "email": bob["email"],
        },
        headers=alice["AuthHeader"],
    )
    assert response_add_p1_bob.status_code == 200

    # Alice updates project2 details - failure
    change_p2_failure = {"title": "this", "description": "shouldn't work"}
    response_update_p2_alice_failure = client.patch(
        f"/project/{project2['id']}",
        headers=alice["AuthHeader"],
        json=change_p2_failure,
    )
    assert response_update_p2_alice_failure.status_code == 403


@pytest.mark.order(after="test_project_add_user")
def test_project_update_remove(client: TestClient, api_user, api_project) -> None:
    alice = api_user.user_list["alice"]
    bob = api_user.user_list["bob"]
    project1 = api_project.project_list["project1"]
    project2 = api_project.project_list["project2"]

    # Bob adds Alice to project2
    response_add_p2_alice = client.patch(
        f"/project/{project2['id']}/user",
        json={
            "email": alice["email"],
        },
        headers=bob["AuthHeader"],
    )
    assert response_add_p2_alice.status_code == 200

    # Alice updates project2 details
    change_p2 = {"title": "this", "description": "should work"}
    response_update_p2_alice_success = client.patch(
        f"/project/{project2['id']}", headers=alice["AuthHeader"], json=change_p2
    )
    assert response_update_p2_alice_success.status_code == 200

    # Alice changes title and description of project1
    change_p1 = {"title": "its weird", "description": "innit?"}
    response_update_p1 = client.patch(
        f"/project/{project1['id']}", headers=alice["AuthHeader"], json=change_p1
    )
    assert response_update_p1.status_code == 200

    # Bob changes title and description of project2
    change_p2 = {"title": "You know the rules", "description": "and so do I"}
    response_update_p2 = client.patch(
        f"/project/{project2['id']}", headers=bob["AuthHeader"], json=change_p2
    )
    assert response_update_p2.status_code == 200

    # Bob updates project3 and removes it
    project3 = api_project.create(bob, "project3")
    change_p3 = {"title": "Its dark", "description": "and cold"}
    response_update_p3 = client.patch(
        f"/project/{project3['id']}", headers=bob["AuthHeader"], json=change_p3
    )
    assert response_update_p3.status_code == 200
    response_remove_p3 = client.delete(
        f"/project/{project3['id']}", headers=bob["AuthHeader"]
    )
    assert response_remove_p3.status_code == 200


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
        "/user", headers=charlie["AuthHeader"], json=update_charlie
    )
    assert response_update_charlie.status_code == 200

    # Charlie removes user charlie - failure (changed email)
    response_remove_charlie_failure = client.delete(
        "/user", headers=charlie["AuthHeader"]
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
    response_remove_charlie = client.delete("/user", headers=charlie["AuthHeader"])
    assert response_remove_charlie.status_code == 200


@pytest.mark.order(after="test_project_add_user")
def test_codes_create(client: TestClient, api_user, api_project, api_code) -> None:
    project1 = api_project.project_list["project1"]
    alice = api_user.user_list["alice"]

    # Alice creates three codes in project1
    codes_project1_before_response = client.get(
        f"/project/{project1['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_before = len(codes_project1_before_response)

    code1 = api_code.create("code1", alice, project1)
    _ = api_code.create("code2", alice, project1)
    _ = api_code.create("code3", alice, project1)

    code1_read_response = client.get(
        f"code/{code1['id']}", headers=alice["AuthHeader"]
    ).json()
    assert code1_read_response["name"] == code1["name"]
    assert code1_read_response["color"] == code1["color"]
    assert code1_read_response["description"] == code1["description"]
    assert code1_read_response["parent_id"] == code1["parent_id"]
    assert code1_read_response["id"] == code1["id"]
    assert code1_read_response["project_id"] == code1["project_id"]

    codes_project1_after_response = client.get(
        f"/project/{project1['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_after = len(codes_project1_after_response)

    assert codes_project1_after == codes_project1_before + 3

    # Bob creates three codes in project2
    bob = api_user.user_list["bob"]
    project2 = api_project.project_list["project2"]
    codes_project2_before_response = client.get(
        f"/project/{project2['id']}/code", headers=bob["AuthHeader"]
    ).json()
    codes_project2_before = len(codes_project2_before_response)
    code4 = api_code.create("code4", bob, project2)
    code5 = api_code.create("code5", bob, project2)
    code6 = api_code.create("code6", bob, project2)

    code6_read_response = client.get(
        f"code/{code6['id']}", headers=bob["AuthHeader"]
    ).json()
    assert code6_read_response["name"] == code6["name"]
    assert code6_read_response["color"] == code6["color"]
    assert code6_read_response["description"] == code6["description"]
    assert code6_read_response["parent_id"] == code6["parent_id"]
    assert code6_read_response["id"] == code6["id"]
    assert code6_read_response["project_id"] == code6["project_id"]

    codes_project2_after = client.get(
        f"/project/{project2['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project2_after = len(codes_project2_after)

    assert codes_project2_after == codes_project2_before + 3

    # Alice creates a memo for code1
    code1_memo = {
        "title": "You know the codes",
        "content": "and so do i",
        "content_json": "",
        "starred": True,
    }
    code1_memo_create_response = client.put(
        f"/memo?attached_object_id={code1['id']}&attached_object_type={AttachedObjectType.code.value}",
        headers=alice["AuthHeader"],
        json=code1_memo,
    )
    assert code1_memo_create_response.status_code == 200
    code1_memo["id"] = code1_memo_create_response.json()["id"]

    code1_memo_read_response = client.get(
        f"/memo/attached_obj/code/to/{code1['id']}",
        headers=alice["AuthHeader"],
    ).json()[0]
    assert code1_memo_read_response["title"] == code1_memo["title"]
    assert code1_memo_read_response["content"] == code1_memo["content"]
    assert code1_memo_read_response["content_json"] == code1_memo["content_json"]
    assert code1_memo_read_response["id"] == code1_memo["id"]
    assert code1_memo_read_response["starred"] == code1_memo["starred"]
    assert code1_memo_read_response["project_id"] == code1["project_id"]
    assert code1_memo_read_response["attached_object_id"] == code1["id"]
    assert code1_memo_read_response["attached_object_type"] == "code"
    assert code1_memo_read_response["user_id"] == alice["id"]

    # Bob removes code4
    code4_remove_response = client.delete(
        f"code/{code4['id']}", headers=bob["AuthHeader"]
    )
    assert code4_remove_response.status_code == 200

    # Bob updates code5 and removes it
    code5_update = {
        "name": "tick",
        "color": "trick",
        "description": "track",
    }
    code5_update_response = client.patch(
        f"code/{code5['id']}", headers=bob["AuthHeader"], json=code5_update
    )
    assert code5_update_response.status_code == 200
    code5_update_response = code5_update_response.json()

    code5_remove_response = client.delete(
        f"code/{code5['id']}", headers=bob["AuthHeader"]
    )
    assert code5_remove_response.status_code == 200

    # Bob removes code6
    code6_remove_response = client.delete(
        f"code/{code6['id']}", headers=bob["AuthHeader"]
    )
    assert code6_remove_response.status_code == 200


@pytest.mark.order(after="test_project_add_user")
def test_upload_documents(client, api_user, api_project, api_document) -> None:
    import time

    alice = api_user.user_list["alice"]
    project1 = api_project.project_list["project1"]

    # Alice uploads two text documents to project1
    text_response12 = api_document.create([text_doc1, text_doc2], alice, project1)

    text1_prepro_job_id = text_response12[text_doc1[1]]["prepro_job_id"]
    text2_prepro_job_id = text_response12[text_doc2[1]]["prepro_job_id"]

    text1_prepro_status = api_document.prepro_status(text1_prepro_job_id, alice)
    text2_prepro_status = api_document.prepro_status(text2_prepro_job_id, alice)
    while text1_prepro_status == "Running" or text2_prepro_status == "Running":
        text1_prepro_status = api_document.prepro_status(text1_prepro_job_id, alice)
        text2_prepro_status = api_document.prepro_status(text2_prepro_job_id, alice)
        time.sleep(3)
    assert text1_prepro_status == "Finished"
    assert text2_prepro_status == "Finished"

    api_document.get_sdoc_id(text_doc1[1], alice)
    api_document.get_sdoc_id(text_doc2[1], alice)

    # Alice uploads two image documents to project1
    image_response12 = api_document.create([image_doc1, image_doc2], alice, project1)
    image1_prepro_job_id = image_response12[image_doc1[1]]["prepro_job_id"]
    image2_prepro_job_id = image_response12[image_doc2[1]]["prepro_job_id"]

    image1_prepro_status = api_document.prepro_status(image1_prepro_job_id, alice)
    image2_prepro_status = api_document.prepro_status(image2_prepro_job_id, alice)
    while image1_prepro_status == "Running" or image2_prepro_status == "Running":
        image1_prepro_status = api_document.prepro_status(image1_prepro_job_id, alice)
        image2_prepro_status = api_document.prepro_status(image2_prepro_job_id, alice)
        time.sleep(3)
    assert image1_prepro_status == "Finished"
    assert image2_prepro_status == "Finished"

    api_document.get_sdoc_id(image_doc1[1], alice)
    api_document.get_sdoc_id(image_doc2[1], alice)

    # Alice uploads two video documents to project1
    video_response12 = api_document.create([video_doc1, video_doc2], alice, project1)
    video1_prepro_job_id = video_response12[video_doc1[1]]["prepro_job_id"]
    video2_prepro_job_id = video_response12[video_doc2[1]]["prepro_job_id"]

    video1_propro_status = api_document.prepro_status(video1_prepro_job_id, alice)
    video2_prepro_status = api_document.prepro_status(video2_prepro_job_id, alice)
    while video1_propro_status == "Running" or video2_prepro_status == "Running":
        video1_propro_status = api_document.prepro_status(video1_prepro_job_id, alice)
        video2_prepro_status = api_document.prepro_status(video2_prepro_job_id, alice)
        time.sleep(3)
    assert video1_propro_status == "Finished"
    assert video2_prepro_status == "Finished"

    api_document.get_sdoc_id(video_doc1[1], alice)
    api_document.get_sdoc_id(video_doc2[1], alice)

    # Alice uploads two audio documents to project1
    audio_response12 = api_document.create([audio_doc1, audio_doc2], alice, project1)
    audio1_prepro_job_id = audio_response12[audio_doc1[1]]["prepro_job_id"]
    audio2_prepro_job_id = audio_response12[audio_doc2[1]]["prepro_job_id"]

    audio1_prepro_status = api_document.prepro_status(audio1_prepro_job_id, alice)
    audio2_prepro_status = api_document.prepro_status(audio2_prepro_job_id, alice)
    while audio1_prepro_status == "Running" or audio2_prepro_status == "Running":
        audio1_prepro_status = api_document.prepro_status(audio1_prepro_job_id, alice)
        audio2_prepro_status = api_document.prepro_status(audio2_prepro_job_id, alice)
        time.sleep(3)

    assert audio1_prepro_status == "Finished"
    assert audio2_prepro_status == "Finished"

    api_document.get_sdoc_id(audio_doc1[1], alice)
    api_document.get_sdoc_id(audio_doc2[1], alice)

    # Bob uploads two text documents to project2
    bob = api_user.user_list["bob"]
    project2 = api_project.project_list["project2"]

    text_response34 = api_document.create([text_doc3, text_doc4], bob, project2)

    text3_prepro_job_id = text_response34[text_doc3[1]]["prepro_job_id"]
    text4_prepro_job_id = text_response34[text_doc4[1]]["prepro_job_id"]

    text3_prepro_status = api_document.prepro_status(text3_prepro_job_id, bob)
    text4_prepro_status = api_document.prepro_status(text4_prepro_job_id, bob)
    while text3_prepro_status == "Running" or text4_prepro_status == "Running":
        text3_prepro_status = api_document.prepro_status(text3_prepro_job_id, bob)
        text4_prepro_status = api_document.prepro_status(text4_prepro_job_id, bob)
        time.sleep(3)
    assert text3_prepro_status == "Finished"
    assert text4_prepro_status == "Finished"

    api_document.get_sdoc_id(text_doc3[1], bob)
    api_document.get_sdoc_id(text_doc4[1], bob)

    # Bob updates textdoc3 and removes it
    text_doc3_rem = api_document.document_list[text_doc3[1]]
    text_doc3_update = {"name": "new me"}
    text_doc3_update_response = client.patch(
        f"sdoc/{text_doc3_rem['sdoc_id']}",
        headers=bob["AuthHeader"],
        json=text_doc3_update,
    )
    assert text_doc3_update_response.status_code == 200

    text_doc3_remove_response = client.delete(
        f"sdoc/{text_doc3_rem['sdoc_id']}", headers=bob["AuthHeader"]
    )
    assert text_doc3_remove_response.status_code == 200

    # Bob uploads two image documents to project2
    image_response34 = api_document.create([image_doc3, image_doc4], bob, project2)
    image3_prepro_job_id = image_response34[image_doc3[1]]["prepro_job_id"]
    image4_prepro_job_id = image_response34[image_doc4[1]]["prepro_job_id"]

    image3_prepro_status = api_document.prepro_status(image3_prepro_job_id, bob)
    image4_prepro_status = api_document.prepro_status(image4_prepro_job_id, bob)
    while image3_prepro_status == "Running" or image4_prepro_status == "Running":
        image3_prepro_status = api_document.prepro_status(image3_prepro_job_id, bob)
        image4_prepro_status = api_document.prepro_status(image4_prepro_job_id, bob)
        time.sleep(3)
    assert image3_prepro_status == "Finished"
    assert image4_prepro_status == "Finished"

    api_document.get_sdoc_id(image_doc3[1], bob)
    api_document.get_sdoc_id(image_doc4[1], bob)

    # Bob uploads two video documents to project2
    video_response34 = api_document.create([video_doc3, video_doc4], bob, project2)
    video3_prepro_job_id = video_response34[video_doc3[1]]["prepro_job_id"]
    video4_prepro_job_id = video_response34[video_doc4[1]]["prepro_job_id"]

    video3_prepro_status = api_document.prepro_status(video3_prepro_job_id, bob)
    video4_prepro_status = api_document.prepro_status(video4_prepro_job_id, bob)
    while video3_prepro_status == "Running" or video4_prepro_status == "Running":
        video3_prepro_status = api_document.prepro_status(video3_prepro_job_id, bob)
        video4_prepro_status = api_document.prepro_status(video4_prepro_job_id, bob)
        time.sleep(3)
    assert video3_prepro_status == "Finished"
    assert video4_prepro_status == "Finished"

    api_document.get_sdoc_id(video_doc3[1], bob)
    api_document.get_sdoc_id(video_doc4[1], bob)

    # Bob uploads two audio documents to project2
    audio_response34 = api_document.create([audio_doc3, audio_doc4], bob, project2)
    audio3_prepro_job_id = audio_response34[audio_doc3[1]]["prepro_job_id"]
    audio4_prepro_job_id = audio_response34[audio_doc4[1]]["prepro_job_id"]

    audio3_prepro_status = api_document.prepro_status(audio3_prepro_job_id, bob)
    audio4_prepro_status = api_document.prepro_status(audio4_prepro_job_id, bob)
    while audio3_prepro_status == "Running" or audio4_prepro_status == "Running":
        audio3_prepro_status = api_document.prepro_status(audio3_prepro_job_id, bob)
        audio4_prepro_status = api_document.prepro_status(audio4_prepro_job_id, bob)
        time.sleep(3)
    assert audio3_prepro_status == "Finished"
    assert audio4_prepro_status == "Finished"

    api_document.get_sdoc_id(audio_doc3[1], bob)
    api_document.get_sdoc_id(audio_doc4[1], bob)

    # Alice creates a memo for text_doc1
    project_text_doc1 = api_document.document_list[text_doc1[1]]
    text_doc1_memo = {
        "title": "Read this",
        "content": "This could help you",
        "content_json": "",
        "starred": False,
    }
    text_doc1_memo_create_response = client.put(
        f"/memo?attached_object_id={project_text_doc1['sdoc_id']}&attached_object_type={AttachedObjectType.source_document.value}",
        headers=alice["AuthHeader"],
        json=text_doc1_memo,
    )
    assert text_doc1_memo_create_response.status_code == 200
    text_doc1_memo["id"] = text_doc1_memo_create_response.json()["id"]
    text_doc1_memo_read_response = client.get(
        f"/memo/attached_obj/source_document/to/{project_text_doc1['sdoc_id']}",
        headers=alice["AuthHeader"],
    ).json()[0]

    assert text_doc1_memo_read_response["title"] == text_doc1_memo["title"]
    assert text_doc1_memo_read_response["content"] == text_doc1_memo["content"]
    assert (
        text_doc1_memo_read_response["content_json"] == text_doc1_memo["content_json"]
    )
    assert text_doc1_memo_read_response["id"] == text_doc1_memo["id"]
    assert text_doc1_memo_read_response["starred"] == text_doc1_memo["starred"]
    assert text_doc1_memo_read_response["user_id"] == alice["id"]
    assert text_doc1_memo_read_response["project_id"] == project_text_doc1["project_id"]
    assert (
        text_doc1_memo_read_response["attached_object_id"]
        == project_text_doc1["sdoc_id"]
    )
    assert text_doc1_memo_read_response["attached_object_type"] == "source_document"


@pytest.mark.order(after="test_project_add_user")
def test_project_memos(client, api_user, api_project) -> None:
    alice = api_user.user_list["alice"]
    project1 = api_project.project_list["project1"]
    project_memo = {
        "title": "This is a memo",
        "content": "containing informations",
        "content_json": "",
        "starred": True,
    }
    memo_response = client.put(
        f"/memo?attached_object_id={project1['id']}&attached_object_type={AttachedObjectType.project.value}",
        headers=alice["AuthHeader"],
        json=project_memo,
    )
    assert memo_response.status_code == 200

    memo_get = client.get(
        f"/memo/attached_obj/project/to/{project1['id']}",
        headers=alice["AuthHeader"],
    ).json()[0]
    assert memo_get["title"] == project_memo["title"]
    assert memo_get["content"] == project_memo["content"]
    assert memo_get["content_json"] == project_memo["content_json"]
    assert memo_get["id"] == memo_response.json()["id"]
    assert memo_get["starred"] == project_memo["starred"]
    assert memo_get["user_id"] == alice["id"]
    assert memo_get["project_id"] == project1["id"]


@pytest.mark.order(after=["test_upload_documents", "test_codes_create"])
def test_span_annotation_and_memo(client, api_code, api_user, api_document) -> None:
    alice = api_user.user_list["alice"]
    project_text_doc1 = api_document.document_list[text_doc1[1]]
    code1 = api_code.code_list["code1"]
    # Alice creates two annotations for Textdoc1
    span1_annotation = {
        "begin": 0,
        "end": 20,
        "begin_token": 0,
        "end_token": 4,
        "span_text": "test",
        "code_id": code1["id"],
        "sdoc_id": project_text_doc1["sdoc_id"],
    }
    span1_create_response = client.put(
        "span", headers=alice["AuthHeader"], json=span1_annotation
    )
    assert span1_create_response.status_code == 200
    span1_id = span1_create_response.json()["id"]

    span1_read_response = client.get(
        f"span/{span1_id}", headers=alice["AuthHeader"]
    ).json()
    assert span1_read_response["begin"] == span1_annotation["begin"]
    assert span1_read_response["end"] == span1_annotation["end"]
    assert span1_read_response["begin_token"] == span1_annotation["begin_token"]
    assert span1_read_response["end_token"] == span1_annotation["end_token"]
    assert span1_read_response["id"] == span1_id
    assert (
        span1_read_response["text"] == span1_annotation["span_text"]
    )  # TODO Inconsistent naming
    assert span1_read_response["code_id"] == span1_annotation["code_id"]
    assert span1_read_response["user_id"] == alice["id"]
    assert span1_read_response["sdoc_id"] == span1_annotation["sdoc_id"]

    code2 = api_code.code_list["code2"]
    span2_annotation = {
        "begin": 5,
        "end": 25,
        "begin_token": 3,
        "end_token": 10,
        "span_text": "new test",
        "code_id": code2["id"],
        "sdoc_id": project_text_doc1["sdoc_id"],
    }
    span2_create_response = client.put(
        "span", headers=alice["AuthHeader"], json=span2_annotation
    )
    span2_id = span2_create_response.json()["id"]
    assert span2_create_response.status_code == 200

    span2_read_response = client.get(
        f"span/{span2_id}", headers=alice["AuthHeader"]
    ).json()
    assert span2_read_response["begin"] == span2_annotation["begin"]
    assert span2_read_response["end"] == span2_annotation["end"]
    assert span2_read_response["begin_token"] == span2_annotation["begin_token"]
    assert span2_read_response["end_token"] == span2_annotation["end_token"]
    assert span2_read_response["id"] == span2_id
    assert span2_read_response["text"] == span2_annotation["span_text"]
    assert span2_read_response["code_id"] == span2_annotation["code_id"]
    assert span2_read_response["sdoc_id"] == span2_annotation["sdoc_id"]
    assert span2_read_response["user_id"] == alice["id"]

    # Alice creates a memo on span annotation 1
    span1_memo1 = {
        "title": "This is urgent",
        "content": "This cat is really cute! Check that out",
        "content_json": "",
        "starred": True,
    }
    span1_memo1_create_response = client.put(
        f"/memo?attached_object_id={span1_id}&attached_object_type={AttachedObjectType.span_annotation.value}",
        headers=alice["AuthHeader"],
        json=span1_memo1,
    )
    assert span1_memo1_create_response.status_code == 200
    span1_memo1_id = span1_memo1_create_response.json()["id"]
    span1_memo1_read_response = client.get(
        f"/memo/attached_obj/span_annotation/to/{span1_id}",
        headers=alice["AuthHeader"],
    ).json()[0]

    assert span1_memo1_read_response["title"] == span1_memo1["title"]
    assert span1_memo1_read_response["content"] == span1_memo1["content"]
    assert span1_memo1_read_response["content_json"] == span1_memo1["content_json"]
    assert span1_memo1_read_response["id"] == span1_memo1_id
    assert span1_memo1_read_response["starred"] == span1_memo1["starred"]
    assert span1_memo1_read_response["user_id"] == alice["id"]
    assert span1_memo1_read_response["project_id"] == project_text_doc1["project_id"]
    assert span1_memo1_read_response["attached_object_id"] == span1_id
    assert span1_memo1_read_response["attached_object_type"] == "span_annotation"

    # Alice creates an annotation for Textdoc2
    project_text_doc2 = api_document.document_list[text_doc2[1]]
    code3 = api_code.code_list["code3"]
    span3_annotation = {
        "begin": 20,
        "end": 40,
        "begin_token": 2,
        "end_token": 9,
        "span_text": "new test",
        "code_id": code3["id"],
        "sdoc_id": project_text_doc2["sdoc_id"],
    }
    span3_create_response = client.put(
        "span", headers=alice["AuthHeader"], json=span3_annotation
    )
    assert span3_create_response.status_code == 200
    span3_id = span3_create_response.json()["id"]

    span3_read_response = client.get(
        f"span/{span3_id}", headers=alice["AuthHeader"]
    ).json()
    assert span3_read_response["begin"] == span3_annotation["begin"]
    assert span3_read_response["end"] == span3_annotation["end"]
    assert span3_read_response["begin_token"] == span3_annotation["begin_token"]
    assert span3_read_response["end_token"] == span3_annotation["end_token"]
    assert span3_read_response["text"] == span3_annotation["span_text"]
    assert span3_read_response["code_id"] == span3_annotation["code_id"]
    assert span3_read_response["sdoc_id"] == span3_annotation["sdoc_id"]
    assert span3_read_response["user_id"] == alice["id"]
    assert span3_read_response["id"] == span3_id

    # Alice creates two annotations for Textdoc1
    span4_annotation = {
        "begin": 0,
        "end": 10,
        "begin_token": 0,
        "end_token": 2,
        "span_text": "test Span",
        "code_id": code1["id"],
        "sdoc_id": project_text_doc1["sdoc_id"],
    }

    span4_create_response = client.put(
        "span", headers=alice["AuthHeader"], json=span4_annotation
    )
    assert span4_create_response.status_code == 200
    span4_id = span4_create_response.json()["id"]

    span4_read_response = client.get(
        f"span/{span4_id}", headers=alice["AuthHeader"]
    ).json()

    assert span4_read_response["begin"] == span4_annotation["begin"]
    assert span4_read_response["end"] == span4_annotation["end"]
    assert span4_read_response["begin_token"] == span4_annotation["begin_token"]
    assert span4_read_response["end_token"] == span4_annotation["end_token"]
    assert span4_read_response["text"] == span4_annotation["span_text"]
    assert span4_read_response["code_id"] == span4_annotation["code_id"]
    assert span4_read_response["sdoc_id"] == span4_annotation["sdoc_id"]
    assert span4_read_response["user_id"] == alice["id"]
    assert span4_read_response["id"] == span4_id

    span5_annotation = {
        "begin": 15,
        "end": 40,
        "begin_token": 10,
        "end_token": 15,
        "span_text": "fifth annotation",
        "code_id": code2["id"],
        "sdoc_id": project_text_doc1["sdoc_id"],
    }
    span5_create_response = client.put(
        "span", headers=alice["AuthHeader"], json=span5_annotation
    )
    assert span5_create_response.status_code == 200
    span5_id = span5_create_response.json()["id"]

    span5_read_response = client.get(
        f"span/{span5_id}", headers=alice["AuthHeader"]
    ).json()
    assert span5_read_response["begin"] == span5_annotation["begin"]
    assert span5_read_response["end"] == span5_annotation["end"]
    assert span5_read_response["begin_token"] == span5_annotation["begin_token"]
    assert span5_read_response["end_token"] == span5_annotation["end_token"]
    assert span5_read_response["text"] == span5_annotation["span_text"]
    assert span5_read_response["code_id"] == span5_annotation["code_id"]
    assert span5_read_response["sdoc_id"] == span5_annotation["sdoc_id"]
    assert span5_read_response["user_id"] == alice["id"]
    assert span5_read_response["id"] == span5_id

    # Bob creates an annotation for Textdoc2
    bob = api_user.user_list["bob"]
    span6_annotation = {
        "begin": 3,
        "end": 30,
        "begin_token": 2,
        "end_token": 20,
        "span_text": "last annotation",
        "code_id": code3["id"],
        "sdoc_id": project_text_doc2["sdoc_id"],
    }
    span6_create_response = client.put(
        "span", headers=bob["AuthHeader"], json=span6_annotation
    )
    assert span6_create_response.status_code == 200
    span6_id = span6_create_response.json()["id"]

    span6_read_response = client.get(
        f"span/{span6_id}", headers=bob["AuthHeader"]
    ).json()
    assert span6_read_response["begin"] == span6_annotation["begin"]
    assert span6_read_response["end"] == span6_annotation["end"]
    assert span6_read_response["begin_token"] == span6_annotation["begin_token"]
    assert span6_read_response["end_token"] == span6_annotation["end_token"]
    assert span6_read_response["text"] == span6_annotation["span_text"]
    assert span6_read_response["code_id"] == span6_annotation["code_id"]
    assert span6_read_response["sdoc_id"] == span6_annotation["sdoc_id"]
    assert span6_read_response["user_id"] == bob["id"]
    assert span6_read_response["id"] == span6_id


@pytest.mark.order(after=["test_upload_documents", "test_codes_create"])
def test_bbox_annotation_and_memo(client, api_code, api_user, api_document) -> None:
    alice = api_user.user_list["alice"]
    project_image_doc1 = api_document.document_list[image_doc1[1]]
    code1 = api_code.code_list["code1"]

    # Alice creates two image annotations for Imagedoc1
    bbox_annotation1 = {
        "x_min": 0,
        "x_max": 10,
        "y_min": 0,
        "y_max": 25,
        "code_id": code1["id"],
        "sdoc_id": project_image_doc1["sdoc_id"],
    }
    bbox_create_response1 = client.put(
        "bbox", headers=alice["AuthHeader"], json=bbox_annotation1
    )
    assert bbox_create_response1.status_code == 200
    bbox1_id = bbox_create_response1.json()["id"]
    bbox_read_response1 = client.get(
        f"bbox/{bbox1_id}", headers=alice["AuthHeader"]
    ).json()
    assert bbox_read_response1["x_min"] == bbox_annotation1["x_min"]
    assert bbox_read_response1["x_max"] == bbox_annotation1["x_max"]
    assert bbox_read_response1["y_min"] == bbox_annotation1["y_min"]
    assert bbox_read_response1["y_max"] == bbox_annotation1["y_max"]
    assert bbox_read_response1["code_id"] == bbox_annotation1["code_id"]
    assert bbox_read_response1["sdoc_id"] == bbox_annotation1["sdoc_id"]
    assert bbox_read_response1["user_id"] == alice["id"]
    assert bbox_read_response1["id"] == bbox1_id

    code2 = api_code.code_list["code2"]
    bbox_annotation2 = {
        "x_min": 30,
        "x_max": 90,
        "y_min": 20,
        "y_max": 50,
        "code_id": code2["id"],
        "sdoc_id": project_image_doc1["sdoc_id"],
    }
    bbox_create_response2 = client.put(
        "bbox", headers=alice["AuthHeader"], json=bbox_annotation2
    )
    assert bbox_create_response2.status_code == 200
    bbox2_id = bbox_create_response2.json()["id"]
    bbox_read_response2 = client.get(
        f"bbox/{bbox2_id}", headers=alice["AuthHeader"]
    ).json()
    assert bbox_read_response2["x_min"] == bbox_annotation2["x_min"]
    assert bbox_read_response2["x_max"] == bbox_annotation2["x_max"]
    assert bbox_read_response2["y_min"] == bbox_annotation2["y_min"]
    assert bbox_read_response2["y_max"] == bbox_annotation2["y_max"]
    assert bbox_read_response2["code_id"] == bbox_annotation2["code_id"]
    assert bbox_read_response2["sdoc_id"] == bbox_annotation2["sdoc_id"]
    assert bbox_read_response2["user_id"] == alice["id"]
    assert bbox_read_response2["id"] == bbox2_id

    # Bob creates an image annotation for Imagedoc1
    bob = api_user.user_list["bob"]
    code3 = api_code.code_list["code3"]

    bbox_annotation3 = {
        "x_min": 12,
        "x_max": 22,
        "y_min": 7,
        "y_max": 700,
        "code_id": code3["id"],
        "sdoc_id": project_image_doc1["sdoc_id"],
    }
    bbox_create_response3 = client.put(
        "bbox", headers=bob["AuthHeader"], json=bbox_annotation3
    )
    assert bbox_create_response3.status_code == 200
    bbox3_id = bbox_create_response3.json()["id"]
    bbox_read_response3 = client.get(
        f"bbox/{bbox3_id}", headers=bob["AuthHeader"]
    ).json()

    assert bbox_read_response3["x_min"] == bbox_annotation3["x_min"]
    assert bbox_read_response3["x_max"] == bbox_annotation3["x_max"]
    assert bbox_read_response3["y_min"] == bbox_annotation3["y_min"]
    assert bbox_read_response3["y_max"] == bbox_annotation3["y_max"]
    assert bbox_read_response3["code_id"] == bbox_annotation3["code_id"]
    assert bbox_read_response3["sdoc_id"] == bbox_annotation3["sdoc_id"]
    assert bbox_read_response3["user_id"] == bob["id"]
    assert bbox_read_response3["id"] == bbox3_id

    # Alice creates, updates and removes a memo for bbox1
    bbox1_memo = {
        "title": "This is an important memo",
        "content": "I like this image",
        "content_json": "",
        "starred": True,
    }
    bbox1_memo1_create_response = client.put(
        f"/memo?attached_object_id={bbox1_id}&attached_object_type={AttachedObjectType.bbox_annotation.value}",
        headers=alice["AuthHeader"],
        json=bbox1_memo,
    )
    bbox1_memo_id = bbox1_memo1_create_response.json()["id"]
    assert bbox1_memo1_create_response.status_code == 200

    bbox1_memo1_read_response = client.get(
        f"/memo/attached_obj/bbox_annotation/to/{bbox1_id}",
        headers=alice["AuthHeader"],
    ).json()[0]
    assert bbox1_memo1_read_response["title"] == bbox1_memo["title"]
    assert bbox1_memo1_read_response["content"] == bbox1_memo["content"]
    assert bbox1_memo1_read_response["content_json"] == bbox1_memo["content_json"]
    assert bbox1_memo1_read_response["id"] == bbox1_memo_id
    assert bbox1_memo1_read_response["starred"] == bbox1_memo["starred"]
    assert bbox1_memo1_read_response["user_id"] == alice["id"]
    assert bbox1_memo1_read_response["project_id"] == project_image_doc1["project_id"]
    assert bbox1_memo1_read_response["attached_object_id"] == bbox1_id
    assert bbox1_memo1_read_response["attached_object_type"] == "bbox_annotation"

    # Bob creates two image annotations for Imagedoc2
    project_image_doc2 = api_document.document_list[image_doc2[1]]

    bbox_annotation4 = {
        "x_min": 39,
        "x_max": 390,
        "y_min": 700,
        "y_max": 701,
        "code_id": code1["id"],
        "sdoc_id": project_image_doc2["sdoc_id"],
    }
    bbox_create_response4 = client.put(
        "bbox", headers=bob["AuthHeader"], json=bbox_annotation4
    )
    assert bbox_create_response4.status_code == 200
    bbox4_id = bbox_create_response4.json()["id"]
    bbox_response4 = client.get(f"bbox/{bbox4_id}", headers=bob["AuthHeader"]).json()

    assert bbox_response4["x_min"] == bbox_annotation4["x_min"]
    assert bbox_response4["x_max"] == bbox_annotation4["x_max"]
    assert bbox_response4["y_min"] == bbox_annotation4["y_min"]
    assert bbox_response4["y_max"] == bbox_annotation4["y_max"]
    assert bbox_response4["code_id"] == bbox_annotation4["code_id"]
    assert bbox_response4["sdoc_id"] == bbox_annotation4["sdoc_id"]
    assert bbox_response4["user_id"] == bob["id"]

    bbox_annotation5 = {
        "x_min": 390,
        "x_max": 600,
        "y_min": 250,
        "y_max": 500,
        "code_id": code2["id"],
        "sdoc_id": project_image_doc2["sdoc_id"],
    }
    bbox_create_response5 = client.put(
        "bbox", headers=bob["AuthHeader"], json=bbox_annotation5
    )
    assert bbox_create_response5.status_code == 200
    bbox5_id = bbox_create_response5.json()["id"]
    bbox_response5 = client.get(f"bbox/{bbox5_id}", headers=bob["AuthHeader"]).json()

    assert bbox_response5["x_min"] == bbox_annotation5["x_min"]
    assert bbox_response5["x_max"] == bbox_annotation5["x_max"]
    assert bbox_response5["y_min"] == bbox_annotation5["y_min"]
    assert bbox_response5["y_max"] == bbox_annotation5["y_max"]
    assert bbox_response5["code_id"] == bbox_annotation5["code_id"]
    assert bbox_response5["sdoc_id"] == bbox_annotation5["sdoc_id"]
    assert bbox_response5["user_id"] == bob["id"]

    # Alice removes bbox1
    bbox1_remove_response = client.delete(
        f"bbox/{bbox1_id}", headers=alice["AuthHeader"]
    )
    assert bbox1_remove_response.status_code == 200


@pytest.mark.order(after="test_project_add_user")
def test_project_metadata(client, api_user, api_project) -> None:
    alice = api_user.user_list["alice"]
    project1 = api_project.project_list["project1"]
    # Alice creates project metadata for project1
    meta = {
        "key": "magic",
        "metatype": "STRING",
        "read_only": False,
        "doctype": "text",
        "project_id": project1["id"],
        "description": "Magic meta",
    }
    response_create = client.put("projmeta", headers=alice["AuthHeader"], json=meta)
    assert response_create.status_code == 200
    id = response_create.json()["id"]
    response_meta = client.get(f"projmeta/{id}", headers=alice["AuthHeader"]).json()
    assert meta["key"] == response_meta["key"]
    assert meta["metatype"] == response_meta["metatype"]
    assert meta["read_only"] == response_meta["read_only"]
    assert meta["doctype"] == response_meta["doctype"]
    assert meta["project_id"] == response_meta["project_id"]

    # Bob updates project metadata for project1
    bob = api_user.user_list["bob"]
    meta_update = {"key": "reality", "metatype": "STRING"}
    response_update = client.patch(
        f"projmeta/{id}", headers=bob["AuthHeader"], json=meta_update
    )
    assert response_update.status_code == 200

    response_meta = client.get(f"projmeta/{id}", headers=alice["AuthHeader"]).json()
    assert meta_update["key"] == response_meta["key"]
    assert meta_update["metatype"] == response_meta["metatype"]
    assert meta["read_only"] == response_meta["read_only"]
    assert meta["doctype"] == response_meta["doctype"]
    assert meta["project_id"] == response_meta["project_id"]

    # Bob removes the project metadata for project1
    response_delete = client.delete(f"projmeta/{id}", headers=bob["AuthHeader"])
    assert response_delete.status_code == 200


@pytest.mark.order(after="test_upload_documents")
def test_documentTag_and_memo(client, api_user, api_document, api_project) -> None:
    # Alice creates a documentTag
    alice = api_user.user_list["alice"]
    project1 = api_project.project_list["project1"]
    doctag1 = {
        "name": "This is a name",
        "color": "blue",
        "description": "This is the description",
        "project_id": project1["id"],
    }
    doctag1_create_response = client.put(
        "doctag", headers=alice["AuthHeader"], json=doctag1
    )
    assert doctag1_create_response.status_code == 200
    doctag1["id"] = doctag1_create_response.json()["id"]

    doctag1_read_response = client.get(
        f"doctag/{doctag1['id']}", headers=alice["AuthHeader"]
    ).json()
    assert doctag1_read_response["name"] == doctag1["name"]
    assert doctag1_read_response["color"] == doctag1["color"]
    assert doctag1_read_response["description"] == doctag1["description"]
    assert doctag1_read_response["parent_id"] is None
    assert doctag1_read_response["id"] == doctag1["id"]
    assert doctag1_read_response["project_id"] == doctag1["project_id"]

    # Alice updates the documentTag
    doctag1_update = {
        "name": "This is an updated tag",
        "color": "azureblue with a touch of yellow",
    }
    doctag1_update_response = client.patch(
        f"doctag/{doctag1['id']}", headers=alice["AuthHeader"], json=doctag1_update
    )
    assert doctag1_update_response.status_code == 200

    doctag1_update_read_response = client.get(
        f"doctag/{doctag1['id']}", headers=alice["AuthHeader"]
    ).json()

    assert doctag1_update_read_response["name"] == doctag1_update["name"]
    assert doctag1_update_read_response["color"] == doctag1_update["color"]
    assert doctag1_read_response["description"] == doctag1["description"]
    assert doctag1_update_read_response["id"] == doctag1["id"]
    assert doctag1_update_read_response["project_id"] == doctag1["project_id"]

    # Alice links three sdoc to a doctag and unlinks one afterwards
    project1_textdoc1 = api_document.document_list[text_doc1[1]]
    project1_textdoc2 = api_document.document_list[text_doc2[1]]
    project1_imagedoc1 = api_document.document_list[image_doc1[1]]

    doctag1_link = {
        "source_document_ids": [
            project1_textdoc1["sdoc_id"],
            project1_textdoc2["sdoc_id"],
            project1_imagedoc1["sdoc_id"],
        ],
        "document_tag_ids": [doctag1["id"]],
    }
    doctag1_link_response = client.patch(
        "doctag/bulk/link", headers=alice["AuthHeader"], json=doctag1_link
    )
    assert doctag1_link_response.status_code == 200

    doctag1_link_read_response = client.get(
        f"doctag/{doctag1['id']}/sdocs", headers=alice["AuthHeader"]
    ).json()

    assert set(doctag1_link_read_response) == set(doctag1_link["source_document_ids"])

    doctag1_unlink = {
        "source_document_ids": [project1_imagedoc1["sdoc_id"]],
        "document_tag_ids": [doctag1["id"]],
    }

    doctag1_unlink_response = client.request(
        "delete", "doctag/bulk/unlink", headers=alice["AuthHeader"], json=doctag1_unlink
    )
    assert doctag1_unlink_response.status_code == 200

    doctag1_unlink_read_response = client.get(
        f"doctag/{doctag1['id']}/sdocs", headers=alice["AuthHeader"]
    ).json()
    doctag1_link_remain = doctag1_link["source_document_ids"]
    doctag1_link_remain.remove(project1_imagedoc1["sdoc_id"])

    assert set(doctag1_unlink_read_response) == set(doctag1_link_remain)

    # Alice creates a memo on the documentTag
    doctag1_memo = {
        "title": "This is a memo about...",
        "content": "a doctag!",
        "content_json": "",
        "starred": False,
    }
    doctag1_memo_create_response = client.put(
        f"/memo?attached_object_id={doctag1['id']}&attached_object_type={AttachedObjectType.document_tag.value}",
        headers=alice["AuthHeader"],
        json=doctag1_memo,
    )
    assert doctag1_memo_create_response.status_code == 200
    doctag1_memo["id"] = doctag1_memo_create_response.json()["id"]

    doctag1_memo_read_response = client.get(
        f"/memo/attached_obj/document_tag/to/{doctag1['id']}",
        headers=alice["AuthHeader"],
    ).json()[0]
    assert doctag1_memo_read_response["title"] == doctag1_memo["title"]
    assert doctag1_memo_read_response["content"] == doctag1_memo["content"]
    assert doctag1_memo_read_response["content_json"] == doctag1_memo["content_json"]
    assert doctag1_memo_read_response["id"] == doctag1_memo["id"]
    assert doctag1_memo_read_response["starred"] == doctag1_memo["starred"]
    assert doctag1_memo_read_response["user_id"] == alice["id"]
    assert doctag1_memo_read_response["project_id"] == doctag1["project_id"]
    assert doctag1_memo_read_response["attached_object_id"] == doctag1["id"]
    assert doctag1_memo_read_response["attached_object_type"] == "document_tag"

    # Alice removes the documentTag
    doctag1_delete_response = client.delete(
        f"doctag/{doctag1['id']}", headers=alice["AuthHeader"]
    )

    assert doctag1_delete_response.status_code == 200
