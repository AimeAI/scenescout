# Contributing to SceneScout v14

Thank you for your interest in contributing to SceneScout! This guide will help you understand our development process, coding standards, and how to submit contributions.

## 🎯 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally: `git clone https://github.com/yourusername/scenescout.git`
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`
4. **Make your changes** following our coding standards
5. **Test thoroughly** and ensure all checks pass
6. **Submit a pull request** with a clear description

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Git Workflow](#git-workflow)
6. [Testing Requirements](#testing-requirements)
7. [Pull Request Process](#pull-request-process)
8. [Documentation Standards](#documentation-standards)
9. [Issue Reporting](#issue-reporting)
10. [Community Guidelines](#community-guidelines)

## 🤝 Code of Conduct

SceneScout is committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to adhere to our Code of Conduct:

### Our Pledge
- **Be respectful** and inclusive in all interactions
- **Be collaborative** and constructive in feedback
- **Be patient** with newcomers and different skill levels
- **Be professional** in all communications

### Unacceptable Behavior
- Harassment or discrimination of any kind
- Trolling, insulting, or derogatory comments
- Public or private harassment
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

### Enforcement
Code of conduct violations can be reported to [conduct@scenescout.app](mailto:conduct@scenescout.app). All reports will be reviewed and investigated promptly and fairly.

## 🛠️ Development Setup

### Prerequisites
- **Node.js 18.0+** and npm
- **Git** for version control
- **Supabase CLI** for local development
- **Code editor** (VS Code recommended)

### Initial Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/scenescout.git
cd scenescout

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-typescript.vscode-typescript",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

### Environment Configuration

Ensure you have the required environment variables set up. See [SETUP.md](./SETUP.md) for detailed configuration instructions.

## 🏗️ Project Structure

Understanding the project structure will help you navigate and contribute effectively:

```
src/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Auth-related pages
│   ├── admin/               # Admin dashboard pages
│   ├── api/                 # API routes
│   ├── city/[slug]/         # Dynamic city pages
│   ├── globals.css          # Global styles
│   └── layout.tsx           # Root layout
├── components/              # Reusable React components
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── EventCard.tsx        # Feature-specific components
│   ├── Navigation.tsx       # Navigation components
│   └── ...
├── lib/                     # Utility libraries
│   ├── supabase.ts          # Database client
│   ├── auth.ts              # Authentication utilities
│   ├── utils.ts             # General utilities
│   └── validations.ts       # Zod validation schemas
└── types/                   # TypeScript type definitions
    └── index.ts             # Shared types
```

### Key Directories

- **`app/`**: Next.js App Router pages and API routes
- **`components/`**: Reusable React components with clear separation of concerns
- **`lib/`**: Utility functions, API clients, and business logic
- **`types/`**: TypeScript definitions and interfaces
- **`supabase/functions/`**: Edge functions for backend processing
- **`db/`**: Database schemas and migrations

## 📝 Coding Standards

We maintain high code quality through consistent standards and automated tooling.

### TypeScript Guidelines

```typescript
// Use explicit types for function parameters and returns
export async function getEvents(
  cityId: string,
  filters?: EventFilters
): Promise<Event[]> {
  // Implementation
}

// Use interfaces for object shapes
interface EventFilters {
  category?: string
  dateFrom?: string
  dateTo?: string
  priceMax?: number
}

// Use enums for fixed sets of values
enum EventStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CANCELLED = 'cancelled'
}

// Prefer type assertion over any
const userInput = formData as UserProfile
```

### React Component Standards

```tsx
// Use function components with proper TypeScript
interface EventCardProps {
  event: Event
  showActions?: boolean
  variant?: 'default' | 'compact'
  onSave?: (eventId: string) => void
}

export function EventCard({ 
  event, 
  showActions = true,
  variant = 'default',
  onSave 
}: EventCardProps) {
  // Component implementation
}

// Use proper error boundaries and loading states
export function EventList() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Implementation with proper error handling
}
```

### CSS and Styling Standards

We use **Tailwind CSS** with **shadcn/ui** components:

```tsx
// Prefer Tailwind classes over custom CSS
const EventCard = ({ event }: EventCardProps) => (
  <div className="rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {event.title}
    </h3>
    <p className="text-sm text-gray-600 line-clamp-3">
      {event.description}
    </p>
  </div>
)

// Use CSS variables for consistent theming
/* globals.css */
:root {
  --primary: 220 13% 91%;
  --primary-foreground: 220 9% 9%;
  --secondary: 220 14% 96%;
  --secondary-foreground: 220 9% 46%;
}
```

### Database and API Standards

```typescript
// Use proper error handling for database operations
export async function createEvent(eventData: EventFormData): Promise<Event> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Event creation failed:', error)
    throw error
  }
}

// Use RLS policies instead of manual auth checks
// Database policies handle authorization automatically
```

### Edge Function Standards

```typescript
// Use proper error handling and response formatting
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process request
    const result = await processRequest(req)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

## 🌿 Git Workflow

We use a **feature branch workflow** with **conventional commits**.

### Branch Naming

```bash
# Feature branches
feature/user-authentication
feature/event-search
feature/admin-dashboard

# Bug fix branches
bugfix/login-redirect
bugfix/event-display-mobile

# Hotfix branches
hotfix/security-patch
hotfix/payment-processing

# Documentation branches
docs/api-reference
docs/setup-guide
```

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: type(scope): description

# Feature commits
git commit -m "feat(auth): add OAuth login with GitHub"
git commit -m "feat(events): implement event search filters"

# Bug fix commits
git commit -m "fix(ui): resolve mobile navigation menu overlay"
git commit -m "fix(api): handle null venue data in events endpoint"

# Documentation commits
git commit -m "docs(setup): update environment variable guide"
git commit -m "docs(api): add authentication flow examples"

# Style/formatting commits
git commit -m "style(components): apply consistent button styling"

# Refactoring commits
git commit -m "refactor(auth): extract user session logic to hook"

# Performance commits
git commit -m "perf(db): add indexes for event search queries"

# Test commits
git commit -m "test(auth): add unit tests for login validation"
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvements |
| `test` | Adding missing tests |
| `build` | Changes to build system or external dependencies |
| `ci` | Changes to CI configuration files and scripts |
| `chore` | Other changes that don't modify src or test files |

### Pull Request Workflow

1. **Create feature branch** from `main`
2. **Make focused commits** with clear messages
3. **Keep commits atomic** - one logical change per commit
4. **Test thoroughly** before opening PR
5. **Open PR early** for feedback if needed
6. **Update based on review** feedback
7. **Squash merge** when ready

## ✅ Testing Requirements

All contributions must include appropriate tests and pass existing test suites.

### Test Categories

#### Unit Tests
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import { EventCard } from '../EventCard'

describe('EventCard', () => {
  const mockEvent: Event = {
    id: '123',
    title: 'Test Event',
    description: 'Test Description',
    // ... other required fields
  }

  it('displays event information correctly', () => {
    render(<EventCard event={mockEvent} />)
    
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('calls onSave when save button clicked', () => {
    const mockOnSave = jest.fn()
    render(<EventCard event={mockEvent} onSave={mockOnSave} />)
    
    fireEvent.click(screen.getByText('Save'))
    expect(mockOnSave).toHaveBeenCalledWith('123')
  })
})
```

#### Integration Tests
```typescript
// API route testing
import { createMocks } from 'node-mocks-http'
import handler from '../pages/api/events'

describe('/api/events', () => {
  it('returns events for valid city', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { city: 'new-york' }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(Array.isArray(data.events)).toBe(true)
  })
})
```

#### Database Tests
```typescript
// Database function testing
import { supabase } from '../lib/supabase'
import { createEvent, getEvents } from '../lib/events'

describe('Event database operations', () => {
  beforeEach(async () => {
    // Clean up test data
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  })

  it('creates event successfully', async () => {
    const eventData = {
      title: 'Test Event',
      description: 'Test Description',
      // ... other required fields
    }

    const event = await createEvent(eventData)
    expect(event.title).toBe('Test Event')
  })
})
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test EventCard.test.tsx

# Run tests with debugging
npm test -- --verbose
```

### Test Coverage Requirements

- **New features**: Must have 80%+ test coverage
- **Bug fixes**: Must include regression tests
- **API changes**: Must include integration tests
- **Database changes**: Must include database tests

## 📋 Pull Request Process

### Before Opening a PR

1. **Ensure tests pass** locally
2. **Run linting** and fix any issues
3. **Update documentation** if needed
4. **Test in multiple browsers** if UI changes
5. **Verify mobile responsiveness**

### PR Template

When opening a PR, use this template:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Cross-browser testing

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: All PRs must pass automated checks (tests, linting, build)
2. **Code Review**: At least one maintainer must review and approve
3. **Testing**: Changes must be tested in a staging environment
4. **Documentation**: Documentation must be updated for user-facing changes

### PR Guidelines

- **Keep PRs focused** - one feature or fix per PR
- **Write descriptive titles** and descriptions
- **Include screenshots** for UI changes
- **Link related issues** using keywords like "Closes #123"
- **Respond promptly** to review feedback
- **Keep PR size manageable** (< 400 lines of changes when possible)

## 📚 Documentation Standards

All code changes should include appropriate documentation updates.

### Code Documentation

```typescript
/**
 * Creates a new event in the database
 * @param eventData The event data to create
 * @param userId The ID of the user creating the event
 * @returns Promise that resolves to the created event
 * @throws Error if creation fails or user lacks permission
 */
export async function createEvent(
  eventData: EventFormData,
  userId: string
): Promise<Event> {
  // Implementation
}
```

### API Documentation

Update API documentation for any API changes:

```typescript
/**
 * @api {post} /api/events Create Event
 * @apiName CreateEvent
 * @apiGroup Events
 * 
 * @apiParam {String} title Event title
 * @apiParam {String} description Event description
 * @apiParam {String} cityId City identifier
 * 
 * @apiSuccess {Object} event Created event object
 * @apiSuccess {String} event.id Event ID
 * @apiSuccess {String} event.title Event title
 * 
 * @apiError {String} error Error message
 */
```

### README Updates

Update relevant README files when:
- Adding new features
- Changing setup procedures
- Modifying dependencies
- Updating deployment processes

## 🐛 Issue Reporting

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check documentation** for solutions
3. **Test with latest version**
4. **Gather relevant information** (browser, OS, steps to reproduce)

### Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. iOS, Windows, macOS]
- Browser: [e.g. Chrome, Safari, Firefox]
- Version: [e.g. v14.0.0]

## Additional Context
Add any other context about the problem here.
```

### Feature Request Template

```markdown
## Is your feature request related to a problem?
A clear and concise description of what the problem is.

## Describe the solution you'd like
A clear and concise description of what you want to happen.

## Describe alternatives you've considered
A clear and concise description of any alternative solutions.

## Additional context
Add any other context or screenshots about the feature request here.
```

## 👥 Community Guidelines

### Getting Help

- **Documentation**: Check the `/docs` folder first
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discord**: Join our community Discord for real-time help
- **Email**: Contact [support@scenescout.app](mailto:support@scenescout.app) for private issues

### Contributing Ideas

We welcome contributions in many forms:

- **Code contributions**: Features, bug fixes, optimizations
- **Documentation**: Guides, examples, API docs
- **Design**: UI/UX improvements, accessibility enhancements
- **Testing**: Test coverage improvements, QA testing
- **Community**: Helping others, writing blog posts, giving talks

### Recognition

Contributors are recognized in several ways:

- **Changelog**: All contributors are credited in release notes
- **Contributors file**: Maintained list of all contributors
- **Social media**: Major contributions highlighted on our social channels
- **Swag**: Active contributors receive SceneScout merchandise

## 🚀 Development Tips

### Performance Best Practices

```typescript
// Use React.memo for expensive components
export const EventCard = React.memo(({ event }: EventCardProps) => {
  return <div>{/* Component content */}</div>
})

// Use useMemo for expensive calculations
const filteredEvents = useMemo(() => {
  return events.filter(event => 
    event.category === selectedCategory
  )
}, [events, selectedCategory])

// Use useCallback for event handlers passed to children
const handleEventSave = useCallback((eventId: string) => {
  // Save logic
}, [])
```

### Accessibility Guidelines

```tsx
// Include proper ARIA labels and keyboard navigation
<button
  aria-label={`Save event: ${event.title}`}
  onClick={() => onSave(event.id)}
  onKeyDown={(e) => e.key === 'Enter' && onSave(event.id)}
>
  Save
</button>

// Use semantic HTML
<main role="main">
  <section aria-labelledby="events-heading">
    <h2 id="events-heading">Upcoming Events</h2>
    {/* Events list */}
  </section>
</main>
```

### SEO Considerations

```tsx
// Use proper metadata in pages
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Events in New York | SceneScout',
  description: 'Discover the best events in New York City...',
  openGraph: {
    title: 'Events in New York',
    description: 'Discover the best events...',
    images: ['/og-image-ny.jpg']
  }
}
```

---

## 📞 Contact

For questions about contributing, reach out to:

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bugs and feature requests  
- **Email**: [contributors@scenescout.app](mailto:contributors@scenescout.app)
- **Discord**: [Join our community](https://discord.gg/scenescout)

Thank you for contributing to SceneScout! 🎭