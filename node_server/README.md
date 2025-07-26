# Node.js Server

### Download dependencies

    npm install

### Environment

- Create a .env file

    DATABASE_URL=postgresql://postgres.lnuyvumdykytqanmvzou:Celeritas123!@aws-0-us-east-2.pooler.supabase.com:6543/postgres
    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json


### Running the node server locally

- Uncomment the first line in `index.js`. Just be sure to comment this line back out for deployment.

    require('dotenv').config()

- Run the node server

    npm run dev