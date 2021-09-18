.PHONY: help bracketeer images prettier
help: ## Show this help
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m- %s\n", $$1, $$2}'

bracketeer: ## Build the Docker container for the bracketeer
	docker build -t mgwalker/fat-bear-bracketeer ./builder

prettier:
	npx prettier -w builder/* site/* --ignore-unknown