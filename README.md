# Spoof SMS API

A Node.js-based API for SMS spoofing and user authentication. This project provides endpoints for sending SMS messages, user registration, token management, and logging.

## Overview

This project is an Express.js application that integrates with multiple SMS service providers (Nexmo and Mailgun) to send SMS messages. It includes user authentication via JWT, password hashing with bcryptjs, and comprehensive logging capabilities.

**Note:** This project is for educational purposes only. Ensure you comply with all applicable laws and regulations when using SMS services.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **SMS Services**: Integration with Nexmo and Mailgun for SMS delivery
- **User Management**: Registration, token management, and user data logging
- **Express.js REST API**: RESTful endpoints for easy integration
- **MongoDB Integration**: Persistent data storage with Mongoose ODM
- **CORS Support**: Cross-origin resource sharing enabled
- **Request Validation**: Input validation using Joi schema validation
- **Passport Authentication**: JWT strategy for secure endpoint protection

## Project Structure

```
ssa/
├── app.js                 # Main application entry point
├── package.json           # Project dependencies and metadata
├── Dockerfile             # Docker containerization
├── config/
│   ├── keys.js           # Configuration and API keys
│   └── passport.js       # Passport JWT strategy setup
├── middleware/
│   └── auth.js           # Authentication middleware
├── model/
│   ├── Log.js            # Logging schema and model
│   ├── RegisterToken.js  # Token registration schema
│   └── User.js           # User schema and model
├── public/
│   ├── index.html        # Frontend home page
│   └── redirect.html     # OAuth redirect page
├── routes/
│   └── api/
│       ├── sms.js        # SMS endpoints
│       └── users.js      # User management endpoints
├── services/
│   ├── mailgun.js        # Mailgun SMS service
│   └── nexmo.js          # Nexmo SMS service
└── validate/
    └── sms.js            # SMS validation schemas
```

## Prerequisites

- **Node.js** (v12 or higher)
- **npm** or **yarn**
- **MongoDB** instance (local or cloud)
- **API Keys** for SMS services:
  - Nexmo API credentials
  - Mailgun API credentials

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adityanageshsir/ssa.git
   cd ssa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `config/keys.js`:
   - Set MongoDB connection string
   - Add Nexmo API credentials
   - Add Mailgun API credentials

## Usage

### Start the Application

Development mode (with auto-reload):
```bash
npm run server
```

Production mode:
```bash
npm start
```

The API will be available at `http://localhost:5000` (or your configured port).

### Available Endpoints

#### User Management
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Authenticate user and receive JWT token
- `GET /api/users/profile` - Get user profile (requires authentication)

#### SMS Operations
- `POST /api/sms/send` - Send an SMS message
- `POST /api/sms/verify` - Verify SMS delivery

#### Logging
- `GET /api/logs` - Retrieve SMS logs

## Configuration

Edit `config/keys.js` to configure:
- Database connection URI
- Nexmo API key and secret
- Mailgun API credentials
- JWT secret
- Application port

## Technologies Used

- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **Joi** - Data validation
- **Nexmo** - SMS service provider
- **Mailgun** - Email/SMS service provider
- **Axios** - HTTP client

## Contributing

We welcome contributions from the community! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

### Areas for Contribution

- **Bug Fixes**: Report and fix issues
- **Documentation**: Improve README and code comments
- **Features**: Add new SMS providers or authentication methods
- **Testing**: Write unit and integration tests
- **Performance**: Optimize database queries and API responses

## Code of Conduct

Please review our [Code of Conduct](./CODE_OF_CONDUCT.md) to understand the standards we expect from our community members.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

For issues, questions, or suggestions:
1. Check existing [GitHub Issues](https://github.com/adityanageshsir/ssa/issues)
2. Create a new issue with detailed description
3. Join our community discussions

## Roadmap

- [ ] Add SMS delivery status tracking
- [ ] Implement rate limiting
- [ ] Add SMS template support
- [ ] Multi-language support
- [ ] Enhanced logging and analytics
- [ ] Add Twilio integration
- [ ] Implement WebSocket for real-time updates

## Author

- **Original Author**: un4ckn0wl3z
- **Repository**: [adityanageshsir/ssa](https://github.com/adityanageshsir/ssa)

---

**Made with ❤️ for the developer community**
