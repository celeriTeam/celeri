# Node.js Server

### Download dependencies

    cd node_server
    npm install

### Environment (dev only)

- Create a .env file

    ```
    DATABASE_URL=postgresql://postgres.lnuyvumdykytqanmvzou:Celeritas123!@aws-0-us-east-2.pooler.supabase.com:6543/postgres
    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
    ```
**ask me for the serviceAccountKey.json*

### Build all files

This is necessary for the testing html page as well

```
npm run build
```

### Running the node server locally (dev only)

- Run the node server

    ```
    npm run dev
    ```

This should build and run the server concurrently, and automatically rerun on all file changes.

### Run the test site

- Open `test.html` in your browser: 

    Be sure to give a param for either `dev` or `prod`

    - DEV: `C:/Users/.../flex/node_server/test.html?env=dev`

    - PROD: `C:/Users/.../flex/node_server/test.html?env=prod`