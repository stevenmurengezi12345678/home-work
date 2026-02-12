# Money Tracker - Complete Source Code

Copy and paste these files to recreate the application.

---

## File 1: package.json
**Path:** `package.json`

```json
{
    "name": "money-tracker",
    "version": "1.0.0",
    "private": true,
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start"
    },
    "dependencies": {
        "@hookform/resolvers": "^5.1.1",
        "@radix-ui/react-accordion": "^1.2.11",
        "@radix-ui/react-alert-dialog": "^1.1.14",
        "@radix-ui/react-avatar": "^1.1.10",
        "@radix-ui/react-checkbox": "^1.3.2",
        "@radix-ui/react-dialog": "^1.1.14",
        "@radix-ui/react-dropdown-menu": "^2.1.15",
        "@radix-ui/react-label": "^2.1.7",
        "@radix-ui/react-popover": "^1.1.14",
        "@radix-ui/react-scroll-area": "^1.2.9",
        "@radix-ui/react-select": "^2.2.5",
        "@radix-ui/react-separator": "^1.1.7",
        "@radix-ui/react-slot": "^1.2.3",
        "@radix-ui/react-tabs": "^1.1.12",
        "@radix-ui/react-toast": "^1.2.14",
        "bcryptjs": "^2.4.3",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "js-cookie": "^3.0.5",
        "jsonwebtoken": "^9.0.2",
        "lucide-react": "^0.516.0",
        "mongodb": "^6.6.0",
        "next": "14.2.3",
        "react": "^18",
        "react-dom": "^18",
        "react-hook-form": "^7.58.1",
        "sonner": "^2.0.5",
        "tailwind-merge": "^3.3.1",
        "tailwindcss-animate": "^1.0.7",
        "uuid": "^9.0.1",
        "zod": "^3.25.67"
    },
    "devDependencies": {
        "autoprefixer": "^10.4.19",
        "postcss": "^8",
        "tailwindcss": "^3.4.1"
    }
}
```

---

## File 2: .env
**Path:** `.env`

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=money_tracker_db
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=change-this-to-secure-random-string-in-production
CORS_ORIGINS=*
```

**⚠️ IMPORTANT:** Change JWT_SECRET to a secure random string!

---

## File 3: Backend API
**Path:** `app/api/[[...path]]/route.js`

[See the code above - it's the 335-line file I just showed you]

---

