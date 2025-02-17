import inspect
from typing import Sequence, Set, Tuple

import starlette.routing
from fastapi.routing import APIRoute

from main import app


def test_authentication_required():
    public_routes: Sequence[Tuple[Set[str], str]] = [
        ({"GET"}, "/"),
        ({"GET"}, "/heartbeat"),
        ({"POST"}, "/authentication/login"),
        ({"POST"}, "/authentication/logout"),
        ({"POST"}, "/authentication/refresh_access"),
        ({"POST"}, "/authentication/register"),
        # This route requires authentication, but does so
        # in a manner we couldn't easily verify in the test.
        ({"GET"}, "/user/me"),
        ({"GET"}, "/authentication/content"),
        # FastAPI built-in routes
        ({"GET", "HEAD"}, "/openapi.json"),
        ({"GET", "HEAD"}, "/docs"),
        ({"GET", "HEAD"}, "/docs/oauth2-redirect"),
        ({"GET", "HEAD"}, "/redoc"),
    ]
    for route in app.router.routes:
        # All our routes defined by us extend APIRoute.
        if isinstance(route, APIRoute):
            # If they are whitelisted, we don't need to check them.
            if (route.methods, route.path) in public_routes:
                continue

            # For non-whitelisted routes, check that we have a
            # dependency that checks for authentication.
            auth_dep = [
                dep
                for dep in route.dependencies
                if inspect.isfunction(dep.dependency)
                and dep.dependency.__qualname__ == "get_current_user"
            ]

            assert len(auth_dep) == 1, (
                f"route {route.methods} {route.path} is not protected by authentication"
            )
        elif isinstance(route, starlette.routing.Route):
            # These routes are usually built into FastAPI, and
            # we expect them to not require authentication.
            # To make sure this is not forgotten, they need to # be explicitly whitelisted.
            assert (route.methods, route.path) in public_routes
        else:
            raise Exception(
                f"Authentication testing for route class {route} not implemented yet"
            )
