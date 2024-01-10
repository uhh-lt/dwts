from app.core.analysis.cota.pipeline.cargo import Cargo


def toy_step(cargo: Cargo) -> Cargo:
    cargo.data["toy"] = "Hello World!"

    return cargo


def joy_step(cargo: Cargo) -> Cargo:
    toy = cargo.data["toy"]
    print(toy)
    cargo.data["joy"] = "Hello Universe!"

    return cargo
