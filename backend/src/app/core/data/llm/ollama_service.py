from typing import Type, TypeVar

from loguru import logger
from ollama import Client
from pydantic import BaseModel

from app.util.singleton_meta import SingletonMeta
from config import conf

T = TypeVar("T", bound=BaseModel)


class OllamaService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # Ollama Connection
            ollamac = Client(host=f"{conf.ollama.host}:{conf.ollama.port}")

            # ensure connection to Ollama works
            if not ollamac.list():
                raise Exception(
                    f"Cant connect to Ollama on {conf.ollama.host}:{conf.ollama.port}"
                )

            # ensure that the configured model is available
            model = "custom-" + conf.ollama.model
            available_models = [x.model for x in ollamac.list()["models"]]
            logger.info(f"Available models: {available_models}")
            if model not in available_models:
                logger.info(
                    f"Model {model} is not available. Available models: {available_models}."
                )
                logger.info(f"Creating custom model {model}...")
                ollamac.create(
                    model,
                    from_=conf.ollama.model,
                    parameters={
                        "num_ctx": conf.ollama.context_size,
                    },
                )
                logger.info(f"Model {model} has been created successfully.")
            available_models = [x.model for x in ollamac.list()["models"]]
            assert model in available_models, (
                f"Model {model} is not available. Available models are: {available_models}"
            )

            cls.__model = model
            cls.__client = ollamac

        except Exception as e:
            msg = f"Cannot instantiate OllamaService - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        logger.info("Successfully established connection to Ollama!")

        return super(OllamaService, cls).__new__(cls)

    def chat(self, system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        response = self.__client.chat(
            model=self.__model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                },
                {
                    "role": "user",
                    "content": user_prompt.strip(),
                },
            ],
            format=response_model.model_json_schema(),
        )
        if response.message.content is None:
            raise Exception(f"Ollama response is None: {response}")

        return response_model.model_validate_json(response.message.content)
