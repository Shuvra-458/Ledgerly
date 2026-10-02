up:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

down:
	docker compose down

logs:
	docker compose logs -f app

sh:
	docker compose exec app sh

mongo:
	docker compose exec mongo mongosh -u admin -p supersecret

clean:
	docker compose down -v