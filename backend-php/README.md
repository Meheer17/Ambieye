# Ambieye Backend - PHP Version

A complete PHP backend for the Ambieye application using MySQL database. This is a direct port of the Go backend maintaining the exact same API structure and response formats.

## Features

- ✅ **Same API Structure**: Identical endpoints and response formats as the Go backend
- ✅ **MySQL Database**: Configured database with proper schema
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Role-Based Access Control**: Doctor and Patient roles
- ✅ **Configurable**: Easy .env configuration for database and JWT settings
- ✅ **No Breaking Changes**: Drop-in replacement for the Go backend

## Project Structure

```
backend-php/
├── public/
│   ├── index.php              # Main entry point
│   ├── privacy.html           # Privacy policy page
│   └── delete.html            # Account deletion page
├── src/
│   ├── config/
│   │   └── config.php         # Configuration loader
│   ├── db/
│   │   ├── database.php       # Database connection
│   │   └── models/
│   │       ├── user.php       # User models
│   │       ├── query.php      # Query models
│   │       ├── game.php       # Game models
│   │       └── notification.php # Notification models
│   ├── auth/
│   │   └── jwt.php            # JWT token handling
│   └── api/
│       ├── router.php         # Main router
│       ├── handlers/
│       │   ├── auth.php       # Authentication handler
│       │   ├── doctor.php     # Doctor handler
│       │   ├── patient.php    # Patient handler
│       │   ├── query.php      # Query handler
│       │   ├── game.php       # Game handler
│       │   └── notification.php # Notification handler
│       └── middleware/
│           └── auth.php       # Authentication middleware
├── composer.json              # PHP dependencies
├── .env                       # Configuration file
├── database_schema.sql        # MySQL schema
└── README.md                  # This file
```

## Installation

### Prerequisites

- PHP 7.4+ or PHP 8.0+
- MySQL 5.7+ or MariaDB
- Composer
- Web server (Apache/Nginx with PHP support)

### Setup Steps

1. **Clone/Copy the backend-php folder** to your project:
   ```bash
   cd /path/to/Ambieye
   ```

2. **Install PHP dependencies**:
   ```bash
   cd backend-php
   composer install
   ```

3. **Create MySQL database and tables**:
   ```bash
   mysql -u root -p < database_schema.sql
   ```
   Or manually import `database_schema.sql` through phpMyAdmin/MySQL client.

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and server settings
   ```

5. **Set up web server**:
   - **For Apache**: Ensure `.htaccess` support is enabled and `mod_rewrite` is active
   - **For Nginx**: Configure to route all requests to `public/index.php`

   **Apache Configuration** (.htaccess in public folder):
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule ^ index.php [QSA,L]
   </IfModule>
   ```

   **Nginx Configuration**:
   ```nginx
   location / {
       try_files $uri $uri/ /index.php?$query_string;
   }
   ```

6. **Start the application**:
   - Using PHP built-in server: `php -S localhost:5000 -t public/`
   - Or use your Apache/Nginx server

## Configuration

Edit the `.env` file to configure:

### Database Settings
```env
DB_HOST=localhost        # MySQL host
DB_PORT=3306            # MySQL port
DB_USER=root            # MySQL user
DB_PASSWORD=            # MySQL password
DB_NAME=ambieye         # Database name
```

### Server Settings
```env
PORT=5000               # Server port (info only, actual port depends on web server)
READ_TIMEOUT=15         # Read timeout in seconds
WRITE_TIMEOUT=15        # Write timeout in seconds
IDLE_TIMEOUT=60         # Idle timeout in seconds
```

### JWT Settings
```env
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15    # Access token expiry in minutes
JWT_REFRESH_EXPIRY=168  # Refresh token expiry in hours
REFRESH_TOKEN_NAME=refresh_token
```

## API Endpoints

All endpoints are identical to the Go backend. See the original backend documentation for complete API reference.

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token

### Doctor Routes
- `GET /api/doctor/dashboard` - Doctor dashboard
- `GET /api/doctor/patients` - List patients
- `GET /api/doctor/patients/:id` - Get patient details
- `POST /api/doctor/patients/medicalinfo/:id` - Update medical info
- `POST /api/doctor/patients/visitrecord/:id` - Add visit record
- `GET /api/doctor/profile` - Get doctor profile
- `GET /api/doctor/queries` - Get all queries
- `POST /api/doctor/delete` - Delete account

### Patient Routes
- `GET /api/patient/dashboard` - Patient dashboard
- `GET /api/patient/profile` - Get patient profile
- `PUT /api/patient/profile` - Update profile
- `GET /api/patient/doctors/:id` - Get doctor details
- `GET /api/patient/queries` - Get queries
- `POST /api/patient/delete` - Delete account

### Query Routes
- `POST /api/queries` - Create query
- `GET /api/queries/:id` - Get query
- `PUT /api/queries/:id/answer` - Answer query

### Game Routes
- `POST /api/games/results` - Save game result
- `GET /api/games/today` - Today's results
- `GET /api/games/history` - Game history

## Database Schema

The MySQL schema includes:

1. **users** - User accounts with medical info
2. **queries** - Patient queries and doctor responses
3. **gameResults** - Game performance data
4. **notifications** - User notifications

All tables include proper indexing and foreign keys for data integrity.

## Security Notes

- **Change JWT_SECRET** in production
- Use HTTPS in production
- Keep database credentials secure
- Implement rate limiting at the web server level
- Use environment-specific .env files

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check DB credentials in .env
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### 404 Not Found Errors
- Check web server URL rewriting configuration
- Ensure .htaccess is enabled (Apache) or nginx rules are correct
- Verify the public folder is the document root

### JWT Token Issues
- Verify JWT_SECRET is set in .env
- Check Authorization header format: `Authorization: Bearer <token>`
- Ensure token hasn't expired

### File Upload Issues
- Check file permissions on public folder
- Verify PHP upload_max_filesize setting

## Dependencies

The following PHP packages are installed via Composer:
- `firebase/php-jwt` (^6.0) - JWT token creation and verification

## Performance Considerations

- Database queries are optimized with proper indexing
- Use PDO prepared statements to prevent SQL injection
- Consider caching query results for frequently accessed data
- Monitor slow queries in production

## Future Enhancements

- [ ] Implement notification push service
- [ ] Add image upload support
- [ ] Implement refresh token rotation
- [ ] Add rate limiting middleware
- [ ] Add request logging and monitoring

## Support

For issues or questions about the PHP backend, refer to the original Go backend documentation as the API structure is identical.

## License

Same as the parent Ambieye project.
