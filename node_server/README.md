# Node.js Server

### Download dependencies

- Download all dependencies within the project directory:

    ```
    cd node_server
    npm install
    ```

### Environment (dev only)

- Create a .env file

    ```
    DATABASE_URL=postgresql://postgres.lnuyvumdykytqanmvzou:Celeritas123!@aws-0-us-east-2.pooler.supabase.com:6543/postgres
    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
    ```
    **ask me for the serviceAccountKey.json*

### Build all files

- Run the build function:

    ```
    npm run build
    ```

    This is necessary for the testing html page as well

### Running the node server locally (dev only)

- Run the node server

    ```
    npm run dev
    ```

    This should build and run the server concurrently, and automatically rerun on all file changes.

### Run the test site

- Run:

    ```
    npx serve
    ```

    And open the the local URL.

- To test this using the dev server, add the dev param: 
    
    `http://localhost:.../test?env=dev`