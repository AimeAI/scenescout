# 🚨 SCENESCOUT CRITICAL ISSUES ROADMAP

## 📋 **IDENTIFIED CRITICAL ISSUES**

### 🔍 **1. SEARCH FUNCTIONALITY BROKEN**
- ❌ Search bar on `/search` page doesn't respond to Enter key
- ❌ Search doesn't trigger API calls
- ❌ No integration between search input and map display
- ❌ Events don't appear on map after search

### 🏠 **2. MAIN PAGE FAKE DATA**
- ❌ Shows fake/mock events with made-up dates
- ❌ Events don't link to real venues
- ❌ `/api/scrape-and-load` returns fake data
- ❌ No real event scraping happening

### 🗺️ **3. MAP VIEW BROKEN**
- ❌ Map toggle button doesn't work
- ❌ No actual map rendering
- ❌ Events not plotted on map
- ❌ No interactive markers

### 🔧 **4. FILTER SYSTEM NON-FUNCTIONAL**
- ❌ Category filters don't work
- ❌ Location filtering broken
- ❌ Price filters not connected
- ❌ No real-time filtering

### 🔗 **5. NAVIGATION ISSUES**
- ❌ "Discover" tab doesn't exist
- ❌ Search button doesn't navigate properly
- ❌ Broken routing between pages

---

## 🛠️ **DETAILED FIX ROADMAP**

### **PHASE 1: CORE SEARCH FUNCTIONALITY** ⏱️ *Priority: CRITICAL*

#### **Step 1.1: Fix Search Input Handler**
```typescript
// File: src/components/SimpleSearchMap.tsx
// Issue: onKeyPress doesn't trigger search
// Fix: Add proper event handling
```

#### **Step 1.2: Connect Search to API**
```typescript
// File: src/app/api/search-events/route.ts  
// Issue: Returns fake data
// Fix: Implement real scraping
```

#### **Step 1.3: Real Event Scraping**
```typescript
// Create: src/lib/scrapers/real-event-scraper.ts
// Implement: Live scraping from Eventbrite, Facebook, Meetup
```

### **PHASE 2: MAIN PAGE REAL DATA** ⏱️ *Priority: HIGH*

#### **Step 2.1: Replace Fake Event Generator**
```typescript
// File: src/app/api/scrape-and-load/route.ts
// Issue: Generates fake events
// Fix: Connect to real event sources
```

#### **Step 2.2: Real Event Database**
```sql
-- Clear fake events
DELETE FROM events WHERE source IN ('live_scrape', 'manual', 'fake');

-- Add real event sources
INSERT INTO events (real scraped data);
```

#### **Step 2.3: Fix Event Links**
```typescript
// File: src/app/page.tsx
// Issue: Events don't link to real pages
// Fix: Add proper external_url handling
```

### **PHASE 3: MAP INTEGRATION** ⏱️ *Priority: HIGH*

#### **Step 3.1: Implement Real Map Component**
```typescript
// Create: src/components/RealEventMap.tsx
// Use: Leaflet or Mapbox for actual map rendering
```

#### **Step 3.2: Fix Map Toggle**
```typescript
// File: src/app/page.tsx
// Issue: viewMode toggle doesn't work
// Fix: Implement proper state management
```

#### **Step 3.3: Event Markers**
```typescript
// Add: Interactive markers with real coordinates
// Add: Click handlers for event details
```

### **PHASE 4: FILTER SYSTEM** ⏱️ *Priority: MEDIUM*

#### **Step 4.1: Category Filters**
```typescript
// File: src/hooks/useEvents.ts
// Issue: Filters don't affect results
// Fix: Connect filters to API queries
```

#### **Step 4.2: Location Filters**
```typescript
// Add: Radius-based filtering
// Add: City/region selection
```

#### **Step 4.3: Real-time Filtering**
```typescript
// Add: Instant filter application
// Add: Filter state persistence
```

### **PHASE 5: NAVIGATION & ROUTING** ⏱️ *Priority: MEDIUM*

#### **Step 5.1: Fix Search Navigation**
```typescript
// File: src/app/page.tsx
// Issue: Search button uses window.location.href
// Fix: Use Next.js router
```

#### **Step 5.2: Add Discover Tab**
```typescript
// Create: src/app/discover/page.tsx
// Add: Navigation menu item
```

---

## 🔧 **IMMEDIATE FIXES NEEDED**

### **Fix 1: Search Input Response**
```typescript
// File: src/components/SimpleSearchMap.tsx
// Line: ~45
// Change: onKeyPress to onKeyDown
// Add: Proper event.preventDefault()
```

### **Fix 2: Real Event API**
```typescript
// File: src/app/api/search-events/route.ts
// Replace entire scrapeRealHalloweenEvents function
// Add: Live Eventbrite API integration
```

### **Fix 3: Map View Toggle**
```typescript
// File: src/app/page.tsx
// Add: Proper map component rendering
// Fix: viewMode state handling
```

### **Fix 4: Event Links**
```typescript
// File: src/app/page.tsx
// Add: onClick handlers for event cards
// Fix: external_url navigation
```

---

## 📊 **TESTING CHECKLIST**

### **Search Functionality**
- [ ] Search input responds to typing
- [ ] Enter key triggers search
- [ ] API returns real events
- [ ] Events display on map
- [ ] Links work to real venues

### **Main Page**
- [ ] Shows real events only
- [ ] Events have real dates
- [ ] Links go to actual venues
- [ ] Categories work properly

### **Map Integration**
- [ ] Map toggle works
- [ ] Events plot correctly
- [ ] Markers are clickable
- [ ] Details show properly

### **Filters**
- [ ] Category filters work
- [ ] Location filters work
- [ ] Price filters work
- [ ] Results update instantly

---

## 🚀 **IMPLEMENTATION ORDER**

1. **🔥 CRITICAL (Fix Today)**
   - Search input handler
   - Real event API
   - Map view toggle

2. **⚡ HIGH (Fix This Week)**
   - Replace fake data
   - Event link navigation
   - Basic map rendering

3. **📈 MEDIUM (Fix Next Week)**
   - Filter system
   - Advanced search
   - Performance optimization

4. **🎯 LOW (Future Enhancement)**
   - Real-time updates
   - Advanced features
   - UI polish

---

## 💡 **ROOT CAUSE ANALYSIS**

### **Why Everything is Broken:**
1. **Disconnected Components**: Search, map, and data are not integrated
2. **Fake Data Everywhere**: No real event sources connected
3. **Broken State Management**: Components don't communicate
4. **Missing Event Handlers**: UI interactions don't trigger actions
5. **No Real Scraping**: APIs return mock data instead of live events

### **Core Architecture Issues:**
- Search component isolated from main app
- Map view not implemented
- Event data pipeline broken
- No real external API integration
- State management fragmented across components

---

## ✅ **SUCCESS CRITERIA**

### **When Fixed, User Should Be Able To:**
1. Type "halloween haunted houses" and see real results
2. Click events and visit actual venue websites  
3. Toggle between list and map views seamlessly
4. Filter events by category, location, price
5. See events plotted accurately on interactive map
6. Navigate between pages without broken links

### **Technical Success Metrics:**
- 0 fake/mock events in database
- 100% working external links
- <2 second search response time
- Real GPS coordinates for all events
- Functional map with interactive markers
- Working filters that affect results instantly
