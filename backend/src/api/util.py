from fastapi import HTTPException
from starlette import status

credentials_exception = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)
