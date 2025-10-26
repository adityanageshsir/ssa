# Contributing to Spoof SMS API

Thank you for your interest in contributing to this project! We appreciate your efforts to help improve the Spoof SMS API. This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. **Title**: Brief description of the bug
2. **Description**: Detailed explanation of the issue
3. **Steps to Reproduce**: Clear steps to reproduce the bug
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Environment**:
   - Node.js version
   - npm/yarn version
   - Operating System
   - Any relevant configuration

### Suggesting Enhancements

We welcome suggestions for new features or improvements! Please create an issue with:

1. **Title**: Clear title for your suggestion
2. **Description**: Detailed description of the enhancement
3. **Use Case**: Why is this enhancement needed?
4. **Possible Implementation**: If you have ideas about how to implement it

### Pull Requests

We love pull requests! Here's how to submit one:

#### Step 1: Fork the Repository

```bash
git clone https://github.com/adityanageshsir/ssa.git
cd ssa
git remote add fork https://github.com/YOUR_USERNAME/ssa.git
```

#### Step 2: Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description
```

Use descriptive branch names:
- `feature/add-twilio-integration`
- `fix/jwt-validation-error`
- `docs/update-readme`
- `refactor/optimize-sms-service`

#### Step 3: Make Your Changes

1. Write clean, readable code
2. Follow the existing code style and conventions
3. Add comments for complex logic
4. Ensure your changes don't break existing functionality
5. Test your changes thoroughly

#### Step 4: Commit Your Changes

Write clear and descriptive commit messages:

```bash
git commit -m "feat: add email verification functionality"
# or
git commit -m "fix: resolve JWT token validation issue"
# or
git commit -m "docs: update API endpoint documentation"
```

Follow conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for adding or updating tests
- `style:` for code style changes

#### Step 5: Push to Your Fork

```bash
git push fork feature/your-feature-name
```

#### Step 6: Create a Pull Request

1. Go to the original repository
2. Click "New Pull Request"
3. Select your fork and branch
4. Provide a descriptive title and description
5. Reference any related issues: `Closes #123`
6. Submit the pull request

### Pull Request Guidelines

- **One feature per PR**: Keep PRs focused and manageable
- **Clear description**: Explain what changes you made and why
- **Reference issues**: Link to related issues
- **Keep it updated**: Rebase on main if needed
- **Be responsive**: Respond to feedback and reviews

## Development Setup

### Prerequisites

- Node.js (v12 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

### Installation

```bash
git clone https://github.com/adityanageshsir/ssa.git
cd ssa
npm install
```

### Configuration

1. Create or update `config/keys.js` with your credentials:
   ```javascript
   module.exports = {
     mongoURI: 'your-mongodb-uri',
     jwtSecret: 'your-jwt-secret',
     nexmo: {
       apiKey: 'your-nexmo-key',
       apiSecret: 'your-nexmo-secret'
     },
     mailgun: {
       apiKey: 'your-mailgun-key',
       domain: 'your-mailgun-domain'
     }
   };
   ```

### Running the Application

Development mode:
```bash
npm run server
```

Production mode:
```bash
npm start
```

## Code Style Guidelines

### JavaScript/Node.js

- Use ES6+ syntax where possible
- Use meaningful variable and function names
- Use camelCase for variables and functions
- Use PascalCase for class names
- Use UPPER_SNAKE_CASE for constants
- Use 2-space indentation
- Add comments for complex logic

### Example:

```javascript
// Good
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  return user;
};

// Avoid
const getUB = (id) => {
  return User.findById(id);
};
```

### Documentation

- Add JSDoc comments to functions:

```javascript
/**
 * Sends an SMS message to the specified phone number
 * @param {string} phoneNumber - The recipient phone number
 * @param {string} message - The message content
 * @returns {Promise<Object>} Response from SMS provider
 */
const sendSMS = async (phoneNumber, message) => {
  // Implementation
};
```

## Testing

When adding new features or fixing bugs:

1. Test your changes manually
2. Ensure existing functionality still works
3. Test edge cases and error scenarios
4. Document any new test cases

## Documentation

- Update README.md if you add new features
- Add comments to complex code sections
- Update API documentation for new endpoints
- Keep the project structure documentation current

## Issues to Work On

Look for issues labeled with:
- `good-first-issue` - Perfect for beginners
- `help-wanted` - Contributors needed
- `hacktoberfest` - Perfect for Hacktoberfest contributions

## Community

- **Questions?** Open a discussion or GitHub issue
- **Feature Ideas?** Share in issues with `enhancement` label
- **Found a Bug?** Report with `bug` label
- **Documentation?** Help with `documentation` label

## Recognition

Contributors will be recognized in:
- The project's contributors list
- Release notes for significant contributions
- GitHub's contributor graph

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask! You can:
- Open an issue with your question
- Comment on existing issues
- Create a discussion thread

Thank you for contributing to making this project better! 🚀
