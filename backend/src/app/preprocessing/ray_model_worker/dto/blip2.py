from pydantic import BaseModel, Field


class Blip2FilePathInput(BaseModel):
    project_id: int = Field(examples=[1])
    image_fp: str = Field(examples=["/path/to/image.png"])


class Blip2Output(BaseModel):
    caption: str = Field(examples=["An image of a dog."])
