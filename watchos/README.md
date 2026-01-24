# Kalle Tracker - watchOS App

A native Apple Watch companion app for logging dog activities.

## Requirements

- Mac with Xcode 15+
- Apple Developer account (free or paid)
- iPhone paired with Apple Watch
- watchOS 10.0+

## Setup Instructions

### 1. Create the Xcode Project

1. Open Xcode
2. File → New → Project
3. Select **watchOS** → **App**
4. Configure:
   - Product Name: `KalleTracker`
   - Team: Your Apple Developer account
   - Organization Identifier: `com.yourname` (or your preferred identifier)
   - Interface: **SwiftUI**
   - Language: **Swift**
5. Click **Create**

### 2. Add the Source Files

1. Delete the auto-generated `ContentView.swift` in your project
2. Drag and drop the following files from this folder into your Xcode project:
   - `ContentView.swift`
   - `EntryViewModel.swift`
   - `KalleTrackerApp.swift`
3. When prompted, ensure "Copy items if needed" is checked

### 3. Configure Network Access (if needed)

If you encounter network issues, add this to your `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 4. Build and Run

1. Connect your iPhone (with paired Apple Watch) to your Mac
2. Select your Apple Watch as the run destination
3. Click the Run button (▶️)
4. The app will install on your Apple Watch

## Features

- **Quick Entry Buttons**: Tap to log walks, pee, poop, or food
- **Haptic Feedback**: Feel success/error confirmations
- **Offline Indication**: Shows loading state while syncing
- **Error Handling**: Clear error messages if something goes wrong

## API Endpoint

The app communicates with your Supabase Edge Function:
```
https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1/add-entry
```

Entries logged from the Watch will have `logged_by: "Watch"` in the database.

## Customization

### Change the Dog Name
Edit `ContentView.swift` line 17:
```swift
Text("Kalle")  // Change to your dog's name
```

### Add More Entry Types
Edit the `entryTypes` array in `ContentView.swift`:
```swift
let entryTypes: [(type: String, emoji: String, label: String)] = [
    ("walk", "🚶", "Gassi"),
    ("pee", "💧", "Pipi"),
    ("poop", "💩", "Kacka"),
    ("food", "🍖", "Futter"),
    // Add more types here
]
```

## Troubleshooting

### "Network request failed"
- Ensure your iPhone has internet connectivity
- Check that the Supabase edge function is deployed

### App not appearing on Watch
- Ensure Watch is paired and nearby
- Try restarting both iPhone and Watch
- Check Watch app on iPhone → Installed on Apple Watch

### Build errors
- Ensure you're using Xcode 15+ with watchOS 10 SDK
- Clean build folder: Product → Clean Build Folder
