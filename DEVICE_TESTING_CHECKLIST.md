# Device Testing Checklist for SceneScout

Use this checklist to test your app across different devices before launch.

---

## 🖥️ Desktop Testing

### Chrome (Windows/Mac/Linux)
- [ ] Homepage loads and displays events
- [ ] Categories load without errors
- [ ] Click event → Detail page works
- [ ] Save/unsave events works
- [ ] Thumbs up/down works
- [ ] Custom categories from settings appear
- [ ] Responsive design (resize window to mobile width)
- [ ] PWA install prompt appears
- [ ] Console shows no critical errors

### Firefox
- [ ] All core features work
- [ ] No layout issues
- [ ] Performance is acceptable

### Safari (Mac)
- [ ] All core features work
- [ ] Date/time displays correctly
- [ ] Images load properly
- [ ] No webkit-specific bugs

### Edge
- [ ] Basic functionality works
- [ ] No compatibility issues

---

## 📱 Mobile Testing (Critical!)

### iOS (iPhone/iPad)

#### Safari (Primary)
- [ ] Homepage loads (check 3G/4G/5G/WiFi)
- [ ] Touch interactions work (tap, swipe, scroll)
- [ ] Add to Home Screen works
- [ ] PWA mode: Opens in standalone mode
- [ ] PWA mode: No browser UI visible
- [ ] Bottom navigation doesn't conflict with iOS gestures
- [ ] Location permission prompt works
- [ ] Saved events persist after closing
- [ ] Images load and display correctly
- [ ] Horizontal scroll on carousels works smoothly
- [ ] Date/time formats are correct for locale
- [ ] Back button navigation works
- [ ] Pull-to-refresh works (if implemented)
- [ ] Keyboard doesn't break layout (settings/search)

#### Chrome iOS
- [ ] Basic functionality works
- [ ] Add to Home Screen via Chrome

#### Test Devices
- [ ] iPhone SE (small screen - 4.7")
- [ ] iPhone 12/13/14 (standard - 6.1")
- [ ] iPhone 14 Pro Max (large - 6.7")
- [ ] iPad (tablet layout)

### Android

#### Chrome (Primary)
- [ ] Homepage loads (check 3G/4G/5G/WiFi)
- [ ] Touch interactions work
- [ ] Install PWA prompt appears
- [ ] PWA mode: Opens in standalone
- [ ] Location permission works
- [ ] Saved events persist
- [ ] Images load correctly
- [ ] Horizontal scroll works
- [ ] Back button navigation works
- [ ] Keyboard behavior is correct

#### Samsung Internet
- [ ] Basic functionality works
- [ ] No Samsung-specific bugs

#### Firefox Mobile
- [ ] Core features work

#### Test Devices
- [ ] Small phone (5.5" screen)
- [ ] Standard phone (6.1"-6.5")
- [ ] Large phone (6.7"+)
- [ ] Tablet (if available)

---

## 🧪 Functional Testing (All Devices)

### Core Features
- [ ] **Event Discovery**: Events load and display
- [ ] **Geolocation**: "Near you" shows local events
- [ ] **Event Details**: Clicking event shows full details
- [ ] **Save Events**: Can save/unsave events
- [ ] **Voting**: Thumbs up/down affects recommendations
- [ ] **Custom Categories**: Can add categories in settings
- [ ] **Category Pages**: Clicking "See All" works
- [ ] **Navigation**: All nav items work (Home, Saved, Settings)

### Settings Page
- [ ] Can add custom category
- [ ] Can delete custom category
- [ ] Can toggle categories on/off
- [ ] Can reset to defaults
- [ ] Changes persist after reload

### Edge Cases
- [ ] No location permission granted (should still work)
- [ ] No internet connection (should show cached data or error)
- [ ] Very long event titles don't break layout
- [ ] Events with no image have placeholder
- [ ] Categories with no events show "No events" message

---

## 🚀 Performance Testing

### Load Time
- [ ] First load: < 3 seconds (on 4G)
- [ ] Subsequent loads: < 1 second (cached)
- [ ] API calls complete within 5 seconds

### Smooth Interactions
- [ ] Scrolling is smooth (60fps)
- [ ] Carousel swipe is smooth
- [ ] Page transitions are smooth
- [ ] No janky animations

### Memory/Battery
- [ ] App doesn't consume excessive memory
- [ ] Doesn't drain battery quickly
- [ ] No memory leaks after extended use

---

## 🎨 Visual/UX Testing

### Layout
- [ ] Nothing overlaps or cuts off
- [ ] Consistent spacing and alignment
- [ ] Readable font sizes on all devices
- [ ] Touch targets are large enough (44x44px minimum)
- [ ] No horizontal scrolling (except carousels)

### Dark Mode (if applicable)
- [ ] Looks good in system dark mode
- [ ] Text is readable
- [ ] Images have good contrast

### Accessibility
- [ ] Can navigate with screen reader
- [ ] Color contrast is sufficient
- [ ] Focus indicators are visible

---

## 🔧 Developer Tools Testing

### Browser DevTools
- [ ] No console errors (except expected warnings)
- [ ] No 404 errors in Network tab
- [ ] API calls return data successfully
- [ ] localStorage data persists correctly
- [ ] Service worker registers successfully

### Lighthouse Audit
Run on Chrome DevTools → Lighthouse
- [ ] Performance: > 80
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 90
- [ ] PWA: Passes all checks

---

## 📊 Analytics Testing

- [ ] PostHog tracks page views
- [ ] Events are tracked (clicks, saves, votes)
- [ ] User interactions are logged
- [ ] No PII (Personal Identifiable Information) is tracked

---

## 🐛 Bug Reporting Template

When you find a bug, document it like this:

```
**Device**: iPhone 14 Pro, iOS 17.1
**Browser**: Safari
**Issue**: Carousel doesn't scroll when swiping left
**Steps to Reproduce**:
1. Open homepage
2. Try to swipe left on "Music & Concerts" carousel
3. Nothing happens

**Expected**: Should scroll to next events
**Actual**: No scrolling occurs
**Screenshot**: [attach if possible]
```

---

## ✅ Testing Tools

### Physical Devices (Best)
- Your own phone
- Friends' phones (ask for 10 min testing!)
- Family members' devices

### Browser DevTools (Good)
- Chrome DevTools → Device Toolbar (Cmd/Ctrl + Shift + M)
- Responsive Design Mode
- Test different screen sizes

### Cloud Testing (If needed)
- BrowserStack: https://www.browserstack.com/ (free trial)
- LambdaTest: https://www.lambdatest.com/ (free tier)
- Sauce Labs: https://saucelabs.com/ (free for open source)

### Simulators (OK for quick checks)
- iOS Simulator (Mac only, via Xcode)
- Android Emulator (via Android Studio)

---

## 📝 Final Pre-Launch Checklist

- [ ] Tested on at least 3 different devices
- [ ] Tested on both iOS and Android
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] All core features work
- [ ] Error monitoring is set up (Sentry)
- [ ] Analytics are tracking
- [ ] PWA installs correctly
- [ ] Manifest.json loads without 404
- [ ] Icons are present (192x192, 512x512)

**Once all checked: You're ready to launch! 🚀**

---

## 🎯 Priority Testing Order

1. **YOUR phone** (whatever you use daily) - 30 min
2. **Opposite OS** (if you have iOS, test Android; vice versa) - 30 min  
3. **Desktop Chrome** - 15 min
4. **Friends' devices** (ask 2-3 friends to test) - 1 hour
5. **Browser DevTools responsive mode** (quick check multiple sizes) - 15 min

**Total: ~2.5 hours of testing before launch**

This is a reasonable amount for an MVP with 100 users. You'll catch the big bugs and can fix the rest based on user feedback.
