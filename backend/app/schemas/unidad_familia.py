from pydantic import BaseModel, ConfigDict, Field


class UnidadFamiliaInput(BaseModel):
    familia: str = Field(min_length=1, max_length=50)
    unidad: str = Field(min_length=1, max_length=20)
    permite_decimales: bool = True


class UnidadFamiliaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    familia: str
    unidad: str
    permite_decimales: bool
