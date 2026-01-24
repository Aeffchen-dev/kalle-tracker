import WidgetKit
import SwiftUI
import AppIntents

// App Intent for quick actions directly from widget
struct AddEntryIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Entry"
    static var description = IntentDescription("Log an entry for Kalle")
    
    @Parameter(title: "Entry Type")
    var entryType: EntryType
    
    enum EntryType: String, AppEnum {
        case walk, pee, poop, food
        
        static var typeDisplayRepresentation: TypeDisplayRepresentation = "Entry Type"
        static var caseDisplayRepresentations: [EntryType: DisplayRepresentation] = [
            .walk: "🚶 Gassi",
            .pee: "💧 Pipi",
            .poop: "💩 Kacka",
            .food: "🍖 Futter"
        ]
    }
    
    init() {}
    
    init(type: EntryType) {
        self.entryType = type
    }
    
    func perform() async throws -> some IntentResult {
        let baseURL = "https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1/add-entry"
        
        guard var urlComponents = URLComponents(string: baseURL) else {
            return .result()
        }
        
        urlComponents.queryItems = [
            URLQueryItem(name: "type", value: entryType.rawValue),
            URLQueryItem(name: "logged_by", value: "Widget")
        ]
        
        guard let url = urlComponents.url else {
            return .result()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                // Success - could trigger haptic or notification here
            }
        } catch {
            // Handle error silently for widget
        }
        
        return .result()
    }
}

// Interactive Widget with buttons
struct KalleInteractiveWidget: Widget {
    let kind: String = "KalleInteractiveWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            InteractiveWidgetView(entry: entry)
        }
        .configurationDisplayName("Kalle Quick Actions")
        .description("Tippe um Einträge direkt hinzuzufügen")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct InteractiveWidgetView: View {
    var entry: Provider.Entry
    
    let actions: [(type: AddEntryIntent.EntryType, emoji: String, label: String)] = [
        (.walk, "🚶", "Gassi"),
        (.pee, "💧", "Pipi"),
        (.poop, "💩", "Kacka"),
        (.food, "🍖", "Futter")
    ]
    
    var body: some View {
        HStack(spacing: 8) {
            ForEach(actions, id: \.type) { action in
                Button(intent: AddEntryIntent(type: action.type)) {
                    VStack(spacing: 4) {
                        Text(action.emoji)
                            .font(.title)
                        Text(action.label)
                            .font(.caption)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.primary.opacity(0.1))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

#Preview(as: .systemMedium) {
    KalleInteractiveWidget()
} timeline: {
    KalleEntry(date: .now)
}
