# Ambieye Backend PHP - Quick Start Guide

## ⚡ Quick Setup (5 minutes)

### Option 1: Using Docker (Easiest)

```bash
cd backend-php
docker-compose up -d
```

That's it! Your backend will be available at `http://localhost:5000`

### Option 2: Manual Setup

#### Step 1: Install Dependencies
```bash
cd backend-php
composer install
```

#### Step 2: Create Database
```bash
mysql -u root -p < database_schema.sql
```

#### Step 3: Configure Environment
```bash
nano .env
# Edit with your database credentials:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=ambieye
```

#### Step 4: Start Server
```bash
php -S localhost:5000 -t public/
```

Visit `http://localhost:5000/api/auth/verify` to test (you'll get 401 since no token, which is expected)

## 📝 Configuration

The `.env` file controls everything:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ambieye

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15          # minutes
JWT_REFRESH_EXPIRY=168        # hours (7 days)
```

## 🔑 API Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "userType": "patient",
    "phone": "9876543210",
    "age": "25",
    "gender": "male",
    "fatherName": "Bob",
    "motherName": "Jane",
    "address": "123 Main St",
    "dateOfBirth": "1998-01-01"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123"
  }'
```

### Verify Token
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Save Game Result (Patient)
```bash
curl -X POST http://localhost:5000/api/games/results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "gameId": 1,
    "score": 85,
    "duration": 120.5,
    "details": {"accuracy": "90%"}
  }'
```

## 📂 Project Structure

```
backend-php/
├── src/
│   ├── config/       # Configuration
│   ├── db/           # Database & Models
│   ├── auth/         # JWT handling
│   └── api/          # Handlers & Routing
├── public/
│   ├── index.php     # Entry point
│   ├── privacy.html  # Privacy policy
│   └── delete.html   # Delete account page
├── .env              # Configuration
├── composer.json     # Dependencies
└── database_schema.sql # SQL schema
```

## 🐛 Troubleshooting

### "Database connection failed"
- Check MySQL is running
- Verify .env credentials
- Run: `mysql -u root -p -e "SHOW DATABASES;"`

### "Call to undefined function getallheaders()"
- You're running on Nginx/CGI, not Apache
- Headers handling is automatic with proper config

### "404 Not Found"
- Ensure URL rewriting is configured
- Check your web server root points to `public/` folder
- Test: `curl http://localhost:5000/api/auth/login`

### "JWT verification failed"
- Check JWT_SECRET in .env matches
- Ensure token hasn't expired
- Verify Authorization header format: `Bearer <token>`

## 🚀 Production Deployment

1. **Change JWT_SECRET** to a secure random string
2. **Set DB_PASSWORD** to a strong password
3. **Use HTTPS** for all connections
4. **Enable PHP error logging** (not display)
5. **Set proper file permissions** (755 for dirs, 644 for files)
6. **Use a process manager** like supervisord for PHP-FPM

## 📞 Support

- Check README.md for detailed documentation
- Review database_schema.sql for database structure
- All API endpoints match the Go backend exactly

## ✨ Key Features

✅ Identical API structure to Go backend
✅ MySQL database with proper schema
✅ JWT token authentication
✅ Role-based access control (Doctor/Patient)
✅ Fully configurable via .env
✅ Docker ready
✅ Privacy policy & account deletion pages included
