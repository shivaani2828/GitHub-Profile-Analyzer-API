# GitHub Profile Analyzer API

A Node.js, Express.js, and MySQL backend service that analyzes a public GitHub profile using the GitHub public API, stores useful insights in MySQL, and exposes APIs to retrieve analyzed profiles.

## Features

- Fetch public GitHub profile data by username.
- Fetch public repositories for the user.
- Store useful profile insights in MySQL:
  - Public repository count
  - Public gist count
  - Followers and following count
  - Total stars across public repositories
  - Total forks across public repositories
  - Source repository count
  - Forked repository count
  - Most used repository language
  - Most starred repository
  - Top 5 repositories by stars
- Re-analyzing an existing profile updates the stored record.
- API to list all stored analyzed profiles.
- API to fetch one stored analyzed profile by username.
- Optional GitHub token support for higher API rate limits.

## Tech Stack

- Node.js
- Express.js
- MySQL
- GitHub Public API

## Project Structure

```text
.
├── database/
│   └── schema.sql
├── postman/
│   └── GitHub_Profile_Analyzer_API.postman_collection.json
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-github-repository-link>
cd github-profile-analyzer-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the MySQL database and table

```bash
mysql -u root -p < database/schema.sql
```

Or open `database/schema.sql` in MySQL Workbench and run the script.

### 4. Configure environment variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Update the values:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_profile_analyzer
GITHUB_TOKEN=
```

`GITHUB_TOKEN` is optional, but recommended because unauthenticated GitHub API requests have low rate limits.

### 5. Start the server

```bash
npm run dev
```

For production:

```bash
npm start
```

The API will run at:

```text
http://localhost:5000
```

## API Endpoints

### Health Check

```http
GET /health
```

### Analyze and Store a GitHub Profile

```http
POST /api/profiles/analyze
Content-Type: application/json
```

Request body:

```json
{
  "username": "octocat"
}
```

Alternative route:

```http
POST /api/profiles/octocat/analyze
```

### Get All Stored Analyzed Profiles

```http
GET /api/profiles
```

### Get a Single Stored Analyzed Profile

```http
GET /api/profiles/octocat
```

## Example Response

```json
{
  "success": true,
  "data": {
    "username": "octocat",
    "name": "The Octocat",
    "profileUrl": "https://github.com/octocat",
    "publicRepos": 8,
    "followers": 17000,
    "following": 9,
    "totalStars": 12000,
    "totalForks": 9000,
    "topLanguage": "Ruby",
    "mostStarredRepositoryName": "Spoon-Knife",
    "topRepositories": []
  }
}
```

## Database Schema / Export

The database schema is available at:

```text
database/schema.sql
```

This file can be submitted as the database schema/export for the assignment.

## Postman Collection

Optional Postman collection:

```text
postman/GitHub_Profile_Analyzer_API.postman_collection.json
```

Import it into Postman and update the `baseUrl` variable if your API runs on a different URL.

## Submission Links

- GitHub repository link: `<add-your-github-repository-link>`
- Live deployed API URL: `<add-your-live-api-url>`

## Notes for Deployment

For deployment, configure the same environment variables on your hosting platform. Make sure your deployed MySQL database allows connections from the API server.
