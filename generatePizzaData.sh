# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

response=$(curl -s -X PUT $host/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json')
token=$(echo $response | jq -r '.token')

# Add users
curl -s -X POST $host/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json' > /dev/null
curl -s -X POST $host/api/auth -d '{"name":"pizza franchisee", "email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json' > /dev/null

# Add menu
curl -s -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Veggie", "description": "A garden of delight", "image":"pizza1.png", "price": 0.0038 }'  -H "Authorization: Bearer $token" > /dev/null
curl -s -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Pepperoni", "description": "Spicy treat", "image":"pizza2.png", "price": 0.0042 }'  -H "Authorization: Bearer $token" > /dev/null
curl -s -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Margarita", "description": "Essential classic", "image":"pizza3.png", "price": 0.0042 }'  -H "Authorization: Bearer $token" > /dev/null
curl -s -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Crusty", "description": "A dry mouthed favorite", "image":"pizza4.png", "price": 0.0028 }'  -H "Authorization: Bearer $token" > /dev/null
curl -s -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Charred Leopard", "description": "For those with a darker side", "image":"pizza5.png", "price": 0.0099 }'  -H "Authorization: Bearer $token" > /dev/null

# Add franchise and store with unique name
timestamp=$(date +%s)
franchiseName="pizzaPocket-$timestamp"
franchiseResponse=$(curl -s -X POST $host/api/franchise -H 'Content-Type: application/json' -d "{\"name\": \"$franchiseName\", \"admins\": [{\"email\": \"f@jwt.com\"}]}"  -H "Authorization: Bearer $token")
franchiseId=$(echo "$franchiseResponse" | jq -r '.id // "error"')

if [ "$franchiseId" != "error" ] && [ -n "$franchiseId" ]; then
  curl -s -X POST $host/api/franchise/$franchiseId/store -H 'Content-Type: application/json' -d "{\"franchiseId\": $franchiseId, \"name\":\"SLC\"}" -H "Authorization: Bearer $token" > /dev/null
fi

echo "Database data generated"
