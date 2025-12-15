# LangStudy Makefile
BACKEND_DIR=backend
VENV_DIR=$(BACKEND_DIR)/venv
PYTHON=$(VENV_DIR)/bin/python
PIP=$(VENV_DIR)/bin/pip
.PHONY: setup run clean help

help:
	@echo "LangStudy Makefile Commands:"
	@echo ""
	@echo "  make setup   - Create virtual environment, install dependencies, init database"
	@echo "  make run     - Run the Flask web application"
	@echo "  make clean   - Remove virtual environment"
	@echo ""

setup:
	cd $(BACKEND_DIR) && \
	python3 -m venv venv && \
	. venv/bin/activate && \
	pip install -r requirements.txt && \
	python database.py
	@echo "Setup complete."

run:
	cd $(BACKEND_DIR) && \
	. venv/bin/activate && \
	python app.py

clean:
	rm -rf $(VENV_DIR)
	@echo "✔ Virtual environment removed."
