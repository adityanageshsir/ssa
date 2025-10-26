# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with core functionality
- Enhanced README with comprehensive documentation
- Contributing guidelines for developers
- Code of Conduct for community standards
- Issue templates for bug reports and feature requests
- Pull request template for contributions
- Project structure documentation

### Changed
- Updated README with detailed setup instructions

### Fixed
- Initial stability improvements

## [1.0.0] - 2024-10-26

### Added
- Express.js REST API for SMS operations
- User authentication with JWT and Passport.js
- MongoDB integration with Mongoose ORM
- SMS service integration (Nexmo and Mailgun)
- Password hashing with bcryptjs
- Input validation with Joi
- CORS support
- User registration and login endpoints
- SMS sending and verification endpoints
- Logging functionality
- Docker support

### Security
- JWT-based authentication
- Bcryptjs password hashing
- Request validation and sanitization

---

## How to Use This Changelog

### For Contributors
When creating a pull request, add entries under `[Unreleased]` in the appropriate category:
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for features that will be removed in future versions
- **Removed** for features that have been removed
- **Fixed** for bug fixes
- **Security** for security-related fixes

### For Maintainers
When releasing a new version:
1. Change `[Unreleased]` to the new version number and date
2. Add a link to the version at the bottom
3. Create a new `[Unreleased]` section above the latest release

Example format:
```
## [1.1.0] - 2024-11-01

### Added
- New feature description

### Fixed
- Bug fix description
```

---

**Note:** See the [Contributing Guidelines](./CONTRIBUTING.md) for more details on how to contribute to this project.
