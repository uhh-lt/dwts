import json
import os
from typing import List

from bertopic import BERTopic

from app.core.data.llm.ollama_service import OllamaService

top_words_data = []
topic_distr_data = []


def top_words():
    return top_words_data


def topic_distr() -> list[dict]:
    return topic_distr_data


def get_prompt(index: int):
    top_words_string = ""
    for point in top_words()[index]:
        top_words_string += top_words()[index][point]["word"] + " "
    q_prompt = (
        f"you are a digital humanity expert on Walter Kempowski "
        f"and very professional on topic modeling using bertopic."
        f"giving the following words from bertopic: "
        f"{top_words_string}."
        f"interpret what this topic is about for 3-5 potential results."
        f"I need the result format as follows:"
        f"The top words for this topic are: {top_words_string}"
        f"The interpretation of the top words are below:"
        f"#1. topic name --> summary of the topic from the top words"
    )
    v_prompt = (
        f"You are an expert in the field of digital humanities and topic modeling (especially BERTopic)."
        f"You are working on Walter Kempowski and his project 'Ortslinien'."
        f"Here are a few things you should know about Walter Kempowski and the 'Ortslinien' project: "
        f"Walter Kempowski (1929-2007) was a contemporary German author, collage artist and archivist."
        f"In his last major project, Ortslinien, which he began in 1997, Walter Kempowski left the medium "
        f"of books and worked on the computer to connect text, image, sound and film files, each of which "
        f"was compared over a period of 200 years, day by day.Kempowski left behind several data folders labeled “OL” (for “Ortslinien”) "
        f"-these folders contain the materials that were to become part of Ortslinien and provide an insight into the structure Kempowski planned for the work."
        f"According to the documents left behind by Kempowski, the title Ortslinien is a mathematical term for sets of points and refers to "
        f"'lines or areas on which all points lie that satisfy given conditions'."
        f"The individual points in Kempowski's project include texts, photos, films, paintings and pieces of music or film collected by the author."
        f"Dating plays a central role in all the documents (collected from a wide variety of sources) insofar as it was Kempowski's "
        f"intention to make the various media tangible on a kind of timeline and thus convey a 'spatial sense of time'."
        f"Your colleagues have already carried out topic modeling using BERTopic and you are now to suggest names for the topics based on the top words."
        f"the top words are the following: '{top_words_string}'"
        f"Suggest 3-5 potential topics for each top words list."
        f"I need the result in the following format: "
        f"First, repeat the Top Words in the format: The top words for this topic are: top words."
        f"Second, name the topic and give a brief explanation of why this topic name was chosen."
    )
    v2_prompt = (
        f"You are an expert in the field of digital humanities and topic modeling (especially BERTopic)."
        f"Your colleagues have already carried out topic modeling using BERTopic and you are now to suggest names for the topics based on the top words."
        f"Suggest 3-5 potential topics for each top words list."
        f"the top words are the following: '{top_words_string}'"
        f"I need the result in the following format: "
        f"First, repeat the Top Words in the format: The top words for this topic are: top words."
        f"Second, name the topic and give a brief explanation of why this topic name was chosen."
    )
    fusion_prompt = (
        f"You are an expert in the field of digital humanities and topic modeling (especially BERTopic)."
        f"You are working on Walter Kempowski and his project 'Ortslinien'."
        f"Here are a few things you should know about Walter Kempowski and the 'Ortslinien' project: "
        f"Walter Kempowski (1929-2007) was a contemporary German author, collage artist and archivist."
        f"In his last major project, Ortslinien, which he began in 1997, Walter Kempowski left the medium "
        f"of books and worked on the computer to connect text, image, sound and film files, each of which "
        f"was compared over a period of 200 years, day by day.Kempowski left behind several data folders labeled “OL” (for “Ortslinien”) "
        f"-these folders contain the materials that were to become part of Ortslinien and provide an insight into the structure Kempowski planned for the work."
        f"According to the documents left behind by Kempowski, the title Ortslinien is a mathematical term for sets of points and refers to "
        f"'lines or areas on which all points lie that satisfy given conditions'."
        f"The individual points in Kempowski's project include texts, photos, films, paintings and pieces of music or film collected by the author."
        f"Dating plays a central role in all the documents (collected from a wide variety of sources) insofar as it was Kempowski's "
        f"intention to make the various media tangible on a kind of timeline and thus convey a 'spatial sense of time'."
        f"Your colleagues have already carried out topic modeling using BERTopic and you are now to suggest names for the topics based on the top words."
        f"the top words are the following: '{top_words_string}'"
        f"interpret what this topic is about for 3-5 potential results."
        f"I need the result format as follows:"
        f"The top words for this topic are: {top_words_string}"
        f"The interpretation of the top words are below:"
        f"#1. topic name --> summary of the topic from the top words"
    )

    empty_system_prompt = ""

    system_prompt = (
        "You are to find common words and umbrella terms for a given list of words"
    )
    user_prompt = (
        "'''"
        + top_words_string
        + "'''"
        + " return a list of 5 umbrella terms for the previous words as a comma seperated list, no explanation"
    )
    print(q_prompt, v_prompt, v2_prompt, system_prompt, user_prompt)
    return [empty_system_prompt, fusion_prompt]


def load_bertopic_model():
    topic_model = BERTopic.load("app/core/analysis/bertopic_model_updated-80-5-20")
    topic_info = topic_model.get_topic_info()

    for i in range(len(topic_info) - 1):
        current_topic = topic_model.get_topic(i)
        topic_x_data = {}
        for j in range(len(current_topic)):
            word_data = {
                "word": current_topic[j][0],
                "score": float(current_topic[j][1]),
            }
            topic_x_data[f"{j}"] = word_data
        top_words_data.append(topic_x_data)

    for i in range(1, len(topic_info)):
        topic_data = {"count": int(topic_info["Count"][i])}
        topic_distr_data.append(topic_data)


load_bertopic_model()


def top_words_ollama(topic_id: int) -> List[dict]:
    # read bertopic model and return data

    ollama_service = OllamaService()
    ollama_responses = [
        {
            "prompt": "v2_prompt",
            "response": ollama_service.chat(*get_prompt(topic_id)),
            "top_words": [top_words()[topic_id]],
        }
    ]

    file_name = "ollama_responses.json"
    if os.path.exists(file_name):
        print(f"The file '{file_name}' exists. Loading existing data.")
        with open(file_name, "r") as file:
            data = json.load(file)
    else:
        print(f"The file '{file_name}' does not exist. Starting with an empty list.")
        data = []

    data.append(ollama_responses)

    with open(file_name, "w") as file:
        json.dump(data, file, indent=4)

    return ollama_responses
