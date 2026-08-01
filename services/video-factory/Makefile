.PHONY: install test lint typecheck check dry-run doctor compose-up compose-down schemas

install:
	python -m pip install -e '.[dev,api,orchestrator]'

test:
	pytest

lint:
	ruff check src tests

typecheck:
	mypy src

check: test lint typecheck

dry-run:
	video-factory run examples/briefs/saas-launch.yaml --dry-run

doctor:
	video-factory doctor

compose-up:
	docker compose up --build

compose-down:
	docker compose down

schemas:
	video-factory export-schemas
