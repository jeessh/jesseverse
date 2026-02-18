from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.extensions import service

router = APIRouter()


class RegisterBody(BaseModel):
    name: str
    url: str
    description: str = ""


@router.get("")
def list_extensions():
    return service.list_extensions()


@router.post("", status_code=201)
def register_extension(body: RegisterBody):
    return service.register_extension(body.name, body.url, body.description)


@router.delete("/{name}", status_code=204)
def delete_extension(name: str):
    if not service.get_extension(name):
        raise HTTPException(status_code=404, detail="Extension not found")
    service.delete_extension(name)
