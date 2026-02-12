# Money Tracker - Admin Dashboard

A secure, full-stack web application for tracking daily money and power usage across multiple places. Built with Next.js, React, and MongoDB.

## Features

### 🔐 Authentication & Security
- Secure admin-only access with JWT authentication
- Password validation: minimum 6 characters with both letters and numbers
- Hashed passwords using bcrypt
- Protected API routes with Bearer token authentication
- Auto-login persistence with HTTP-only cookies

### 📍 Places Management
- Create unlimited places (offices, branches, locations)
- Each place gets its own dedicated page
- View aggregated statistics for each place:
  - Total money given
  - Total money used
  - Total power units consumed
  - Number of records
- Delete places (automatically removes all associated records)

### 📊 Records Tracking
- Track daily records for each place with:
  - Date
  - Money Given ($)
  - Money Used ($)
  - Power Units (kWh)
- View records in a sortable table
- Delete individual records
- Real-time statistics calculation

### 🎨 Beautiful UI
- Dark blue and white color scheme
- Gradient backgrounds
- Responsive design for all screen sizes
- Clean, modern interface with shadcn/ui components
- Color-coded statistics (green for income, red for expenses, blue for balance)

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Authentication**: JWT, bcryptjs
- **Styling**: Tailwind CSS with custom blue theme

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running on localhost:27017
- Yarn package manager

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Configure environment variables in `.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=money_tracker_db
NEXT_PUBLIC_BASE_URL=your-domain.com
JWT_SECRET=your-secret-key
```

3. Start the development server:
```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Time Setup

1. Navigate to the home page
2. Click on "Sign Up" tab
3. Create your admin account with:
   - Email address
   - Password (6+ characters with letters and numbers)
4. You'll be automatically logged in to the dashboard

## Usage

### Creating Places
1. From the dashboard, click "Add New Place"
2. Enter the place name (e.g., "Main Office", "Branch A")
3. Click "Create Place"

### Adding Records
1. Click "View Details" on any place card
2. Click "Add New Record"
3. Fill in the form:
   - Date (defaults to today)
   - Money Given ($)
   - Money Used ($)
   - Power Units (kWh)
4. Click "Add Record"

### Viewing Statistics
- Dashboard shows overall statistics across all places
- Each place page shows detailed statistics and all records
- Balance is calculated automatically (Money Given - Money Used)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create admin account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/check` - Verify authentication status

### Places
- `GET /api/places` - Get all places with statistics
- `POST /api/places` - Create new place
- `GET /api/places/{slug}` - Get single place with records
- `DELETE /api/places/{slug}` - Delete place and all records

### Records
- `POST /api/records` - Create new record
- `DELETE /api/records/{id}` - Delete record

## Security Features

✅ Password validation (6+ characters, letters + numbers)
✅ Bcrypt password hashing
✅ JWT authentication with 7-day expiry
✅ Protected API routes
✅ Authorization checks on all endpoints
✅ Secure cookie storage

## Database Schema

### Users Collection
```javascript
{
  id: UUID,
  email: String,
  password: String (hashed),
  createdAt: Date
}
```

### Places Collection
```javascript
{
  id: UUID,
  name: String,
  slug: String,
  userId: UUID,
  createdAt: Date
}
```

### Records Collection
```javascript
{
  id: UUID,
  placeId: UUID,
  date: Date,
  moneyGiven: Number,
  moneyUsed: Number,
  powerUnits: Number,
  createdAt: Date
}
```

## Color Scheme

- **Primary Blue**: #1e3a8a (Dark blue for backgrounds)
- **Secondary Blue**: #2563eb (Medium blue for accents)
- **White**: #ffffff (Cards and text)
- **Green**: For positive values (income, balance)
- **Red**: For negative values (expenses)
- **Yellow**: For power units

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private - Admin use only
