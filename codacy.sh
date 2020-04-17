export $(cat .env | xargs)
bash <(curl -Ls https://coverage.codacy.com/get.sh) report -r coverage/lcov.info
