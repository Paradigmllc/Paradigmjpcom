from __future__ import annotations

from video_factory.pet_movie_contract import (
    allowed_pet_movie_download_url,
    pet_movie_deliverables,
)


def test_pet_movie_downloads_only_accept_r2_signed_hosts() -> None:
    assert allowed_pet_movie_download_url("https://account.r2.cloudflarestorage.com/bucket/photo.jpg?sig=x")
    assert not allowed_pet_movie_download_url("http://account.r2.cloudflarestorage.com/photo.jpg")
    assert not allowed_pet_movie_download_url("https://r2.cloudflarestorage.com.attacker.example/photo.jpg")
    assert not allowed_pet_movie_download_url("https://127.0.0.1/internal")


def test_pet_movie_plan_formats_are_explicit_and_non_generative() -> None:
    assert [item["name"] for item in pet_movie_deliverables("mini", "ja")] == ["vertical-1080p"]
    assert [item["name"] for item in pet_movie_deliverables("story", "en")] == [
        "vertical-1080p",
        "landscape-1080p",
    ]
    assert [item["name"] for item in pet_movie_deliverables("cinema", "en")] == [
        "vertical-1080p",
        "landscape-1080p",
        "square-1080p",
    ]
