# 🧪 Manual Testing Checklist - SceneScout MVP
**Date**: October 4, 2025
**Testing URL**: http://localhost:3000
**Server Status**: ✅ Running

---

## 📋 PRE-TEST SETUP

### 1. Clear Browser Data (Fresh Start)
- [ ] Open Chrome DevTools (Cmd+Option+I or F12)
- [ ] Go to Application tab → Storage → Clear site data
- [ ] Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- [ ] Verify you see the homepage with event categories

### 2. Open Browser Console
- [ ] Keep DevTools open on Console tab
- [ ] Watch for any errors (red text)
- [ ] Note all console messages during testing

---

## 🎯 TEST 1: HOMEPAGE LOADING

### Expected Behavior
- Homepage loads at http://localhost:3000
- 18 category rails displayed
- Events load from Ticketmaster + EventBrite APIs
- No JavaScript errors in console

### Test Steps
1. [ ] Navigate to http://localhost:3000
2. [ ] Count visible category rails (should be 18)
3. [ ] Wait for events to load in each category
4. [ ] Check console for API success messages

### What to Look For
✅ **SUCCESS**:
- Console shows: `✅ {category}: X events from Y TM + Z EB`
- Events display with images, titles, dates
- No red errors in console

❌ **FAILURE**:
- Categories don't load
- Events show as empty
- Console shows errors
- Screenshots: Take screenshot of console + UI

### Notes:
```
Number of categories visible: _____
Events loaded per category: _____
Console errors (if any): _____
```

---

## 🎯 TEST 2: EVENT DETAIL PAGE (CRITICAL)

### Test Event 1: Music/Concert Category
1. [ ] Click first event in "Music & Concerts" category
2. [ ] Note the console message (should see sessionStorage save)
3. [ ] Wait for redirect to `/events/[id]` page

**Expected Console Output**:
```
✅ Using cached event data from sessionStorage
```

**What Should Display**:
- [ ] Event title
- [ ] Large event image at top
- [ ] Date (formatted: "Friday, October 4, 2025")
- [ ] Time (if available)
- [ ] Venue name
- [ ] Venue address
- [ ] Price information
- [ ] Description (if available)
- [ ] "Event Page" button (external link)
- [ ] "Add to Calendar" button
- [ ] "Save" button (heart icon)
- [ ] "Share" button

**Test Results**:
✅ Event detail page loads: YES / NO
✅ All information visible: YES / NO
✅ No missing fields: YES / NO

**Screenshot**: Take screenshot if anything is broken

### Notes:
```
Event clicked: _____
Page loaded: YES / NO
Missing info: _____
Console errors: _____
```

---

## 🎯 TEST 3: BUY TICKETS FLOW

### On Event Detail Page:
1. [ ] Find "Event Page" button (should have ExternalLink icon)
2. [ ] Click the button
3. [ ] Verify it opens Ticketmaster or EventBrite in new tab
4. [ ] Verify URL is correct event page

**Expected Behavior**:
- Opens external event page in new browser tab
- URL is Ticketmaster.com or Eventbrite.com
- Shows correct event details on external site

**Test Results**:
✅ Button exists: YES / NO
✅ Opens new tab: YES / NO
✅ Correct URL: YES / NO
✅ Event matches: YES / NO

### Notes:
```
External URL opened: _____
Platform (TM/EB): _____
Event matches: YES / NO
Issues: _____
```

---

## 🎯 TEST 4: CALENDAR EXPORT (.ics DOWNLOAD)

### On Event Detail Page:
1. [ ] Click "Add to Calendar" button (has Calendar icon)
2. [ ] Check browser Downloads folder
3. [ ] Verify .ics file downloaded
4. [ ] Open .ics file (should open Calendar app)
5. [ ] Verify event details are correct

**Expected Behavior**:
- .ics file downloads immediately
- Filename format: `{event-name}-{date}.ics`
- File opens in default calendar app
- Event details match (title, date, time, location, description)

**Console Should Show**:
```
📅 Calendar event downloaded: {filename}.ics
```

**Test Results**:
✅ File downloaded: YES / NO
✅ Filename correct: YES / NO
✅ Opens in Calendar: YES / NO
✅ Details correct: YES / NO

### Notes:
```
Downloaded filename: _____
Calendar app opened: _____
Event details match: YES / NO
Issues: _____
```

---

## 🎯 TEST 5: SAVE EVENT FUNCTIONALITY

### On Event Detail Page:
1. [ ] Click heart icon (Save button)
2. [ ] Verify heart fills in (becomes solid)
3. [ ] Check console for tracking message
4. [ ] Click heart again to unsave
5. [ ] Verify heart outline returns

**Expected Console Output**:
```
(When saving - no specific message expected)
(When unsaving - no specific message expected)
```

**Test Results**:
✅ Heart toggles: YES / NO
✅ Visual feedback: YES / NO
✅ No console errors: YES / NO

### Notes:
```
Save toggle works: YES / NO
Visual state changes: YES / NO
Issues: _____
```

---

## 🎯 TEST 6: SAVED EVENTS PAGE

### Navigate to Saved Events:
1. [ ] Click "My Events" in sidebar (or navigate to /saved)
2. [ ] Verify saved event appears
3. [ ] Check if event details are correct
4. [ ] Test unsave from this page

**Expected Behavior**:
- Saved events display in grid/list
- Shows event image, title, date
- Can unsave from this page
- Empty state if no saved events

**Test Results**:
✅ Page loads: YES / NO
✅ Saved events show: YES / NO
✅ Details correct: YES / NO
✅ Can unsave: YES / NO

### Notes:
```
Number of saved events: _____
All details visible: YES / NO
Issues: _____
```

---

## 🎯 TEST 7: CROSS-CATEGORY TESTING

### Test 5 Different Events from Different Categories:

**Event 1: Music & Concerts**
- [ ] Click event → Detail page loads
- [ ] "Add to Calendar" works
- [ ] "Event Page" link works
- [ ] Save/unsave works

**Event 2: Nightlife & DJ**
- [ ] Click event → Detail page loads
- [ ] "Add to Calendar" works
- [ ] "Event Page" link works
- [ ] Save/unsave works

**Event 3: Comedy & Improv**
- [ ] Click event → Detail page loads
- [ ] "Add to Calendar" works
- [ ] "Event Page" link works
- [ ] Save/unsave works

**Event 4: Food & Drink**
- [ ] Click event → Detail page loads
- [ ] "Add to Calendar" works
- [ ] "Event Page" link works
- [ ] Save/unsave works

**Event 5: Arts & Exhibits**
- [ ] Click event → Detail page loads
- [ ] "Add to Calendar" works
- [ ] "Event Page" link works
- [ ] Save/unsave works

### Summary Results:
```
Events tested: 5
Successful: _____
Failed: _____
Partial: _____
```

---

## 🎯 TEST 8: EDGE CASES

### Test Missing Data Scenarios:

**Events with No Price**:
- [ ] Find event with no price info
- [ ] Verify price badge shows appropriate fallback
- [ ] Detail page handles missing price gracefully

**Events with No Image**:
- [ ] Find event with no image
- [ ] Verify placeholder or fallback image shows
- [ ] Detail page layout not broken

**Events with No Description**:
- [ ] Find event with minimal description
- [ ] Verify detail page doesn't show empty sections
- [ ] Calendar export still works

**Events with No Venue Address**:
- [ ] Find event with minimal location info
- [ ] Verify "Location TBA" or similar fallback
- [ ] Calendar export uses fallback location

### Notes:
```
Missing price events: _____
Missing image events: _____
Missing description: _____
How app handles: _____
```

---

## 🎯 TEST 9: BROWSER BACK/FORWARD

### Navigation Testing:
1. [ ] Homepage → Click event → Detail page
2. [ ] Click browser back button
3. [ ] Verify returns to homepage (correct position)
4. [ ] Click browser forward button
5. [ ] Verify returns to event detail
6. [ ] Event data still loads correctly

**Test Results**:
✅ Back button works: YES / NO
✅ Returns to correct position: YES / NO
✅ Forward button works: YES / NO
✅ Event data persists: YES / NO

### Notes:
```
Navigation smooth: YES / NO
SessionStorage persists: YES / NO
Issues: _____
```

---

## 🎯 TEST 10: PERFORMANCE CHECK

### Load Times:
1. [ ] Time homepage initial load
2. [ ] Time event detail page load
3. [ ] Time category event loading
4. [ ] Check for any slow operations

**Expected Performance**:
- Homepage: < 3 seconds
- Event detail: < 1 second (sessionStorage)
- Category load: 2-5 seconds (API calls)
- Calendar download: Instant

**Actual Performance**:
```
Homepage load: _____ seconds
Event detail: _____ seconds
Category load: _____ seconds
Calendar download: _____ seconds
```

---

## 📊 FINAL RESULTS SUMMARY

### ✅ WORKING FEATURES (CHECK ALL THAT APPLY)
- [ ] Homepage loads with 18 categories
- [ ] Events load from Ticketmaster + EventBrite
- [ ] Event click → Detail page navigation works
- [ ] Event detail page shows all information
- [ ] "Event Page" button opens Ticketmaster/EventBrite
- [ ] "Add to Calendar" downloads .ics file
- [ ] .ics file opens in Calendar app
- [ ] Event details in calendar are correct
- [ ] Save/unsave event works (heart icon)
- [ ] Saved events page shows saved events
- [ ] Can unsave from saved events page
- [ ] Browser back/forward works correctly
- [ ] No critical console errors

### ❌ BROKEN FEATURES (LIST ALL ISSUES)
```
1. _____
2. _____
3. _____
4. _____
5. _____
```

### ⚠️ PARTIAL FEATURES (WORKS BUT HAS ISSUES)
```
1. _____
2. _____
3. _____
```

---

## 🚨 CRITICAL BUGS TO REPORT

### For Each Bug:
1. **What broke**: _____
2. **Steps to reproduce**: _____
3. **Expected behavior**: _____
4. **Actual behavior**: _____
5. **Console errors**: _____
6. **Screenshot**: (attach if possible)

---

## 🎯 MVP READINESS ASSESSMENT

### Can the app be used right now for its core purpose?

**Core Purpose**: Discover events → Save them → Get reminded → Attend them

| Step | Status | Notes |
|------|--------|-------|
| 1. Discover events | ✅ / ❌ | Homepage + categories |
| 2. View event details | ✅ / ❌ | Detail page |
| 3. Buy tickets | ✅ / ❌ | External link to TM/EB |
| 4. Save events | ✅ / ❌ | Heart icon + localStorage |
| 5. Add to calendar | ✅ / ❌ | .ics download |
| 6. Get reminded | ❌ | NOT IMPLEMENTED |

**MVP Status**:
- ✅ **READY** if all tests pass
- ⚠️ **PARTIAL** if some features broken
- ❌ **NOT READY** if critical features fail

### Your Assessment:
```
Overall status: _____
Usable by founder: YES / NO
Ready for beta users: YES / NO
Critical blockers: _____
Next steps: _____
```

---

## 📸 SCREENSHOTS TO TAKE

1. [ ] Homepage with all categories loaded
2. [ ] Event detail page (full view)
3. [ ] Browser console showing no errors
4. [ ] .ics file in Downloads folder
5. [ ] Calendar app with imported event
6. [ ] Saved events page with events
7. [ ] Any error screens (if they occur)
8. [ ] Any broken UI elements

---

## 🔄 RE-TEST AFTER FIXES

If bugs are found and fixed, re-run this entire checklist to verify:
- [ ] All previously broken features now work
- [ ] No new bugs introduced
- [ ] Performance hasn't degraded
- [ ] Console shows no new errors

---

**Testing completed by**: _____
**Date**: _____
**Time spent**: _____
**Overall verdict**: _____
