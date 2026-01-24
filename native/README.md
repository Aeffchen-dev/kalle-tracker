# Native Home Screen Widgets

Quick-add widgets for iOS and Android that allow instant logging from the home screen.

## iOS Widget

### Requirements
- Xcode 15+
- iOS 17.0+ (for interactive widgets with App Intents)
- Apple Developer account

### Setup

1. **Add Widget Extension to your iOS app:**
   - In Xcode, File → New → Target
   - Select "Widget Extension"
   - Name it "KalleWidget"
   - Uncheck "Include Configuration Intent"

2. **Copy the Swift files:**
   - Replace the generated widget code with files from `ios/KalleWidget/`
   - `KalleWidget.swift` - Basic widget with deep links
   - `KalleInteractiveWidget.swift` - Interactive widget with App Intents (iOS 17+)

3. **Add to Widget Bundle:**
   ```swift
   @main
   struct KalleWidgetBundle: WidgetBundle {
       var body: some Widget {
           KalleWidget()
           KalleInteractiveWidget()
       }
   }
   ```

4. **Handle Deep Links in main app:**
   ```swift
   .onOpenURL { url in
       if url.scheme == "kalletracker",
          let type = url.queryItems?["type"] {
           // Log entry
       }
   }
   ```

### Widget Types

| Size | Behavior |
|------|----------|
| Small | Opens app on tap |
| Medium | 4 buttons - each logs entry directly (iOS 17+) |
| Large | 4 buttons with more space |

---

## Android Widget

### Requirements
- Android Studio
- Android 8.0+ (API 26+)

### Setup

1. **Add to AndroidManifest.xml:**
   ```xml
   <receiver
       android:name=".widget.KalleWidgetProvider"
       android:exported="true">
       <intent-filter>
           <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
           <action android:name="com.kalletracker.ACTION_LOG_ENTRY" />
       </intent-filter>
       <meta-data
           android:name="android.appwidget.provider"
           android:resource="@xml/kalle_widget_info" />
   </receiver>
   ```

2. **Copy files to your Android project:**
   - `KalleWidgetProvider.kt` → `app/src/main/java/com/kalletracker/widget/`
   - `res/layout/kalle_widget.xml` → `app/src/main/res/layout/`
   - `res/drawable/*` → `app/src/main/res/drawable/`
   - `res/xml/kalle_widget_info.xml` → `app/src/main/res/xml/`

3. **Add Coroutines dependency (if not already):**
   ```gradle
   implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
   ```

4. **Add Internet permission:**
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

### Widget Features

- 4 quick-tap buttons (Gassi, Pipi, Kacka, Futter)
- Dark theme matching the app
- Ripple effect on tap
- Background network request
- Resizable horizontally and vertically

---

## API Endpoint

Both widgets use the same edge function:
```
GET https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1/add-entry
  ?type={walk|pee|poop|food}
  &logged_by=Widget
```

Entries logged via widgets will show "Widget" as the logger in the calendar view.

---

## Troubleshooting

### iOS
- **Widget not appearing:** Restart device, check Widget Gallery
- **Buttons not working:** Ensure iOS 17+ for interactive widgets
- **Network errors:** Check App Transport Security settings

### Android
- **Widget not updating:** Check that the receiver is properly registered
- **Clicks not working:** Verify PendingIntent flags include FLAG_IMMUTABLE
- **Network errors:** Ensure INTERNET permission is granted
