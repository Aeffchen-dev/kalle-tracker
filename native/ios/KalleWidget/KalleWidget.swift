import WidgetKit
import SwiftUI

struct KalleEntry: TimelineEntry {
    let date: Date
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> KalleEntry {
        KalleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (KalleEntry) -> ()) {
        completion(KalleEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KalleEntry>) -> ()) {
        let entry = KalleEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct KalleWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView()
        case .systemMedium:
            MediumWidgetView()
        default:
            SmallWidgetView()
        }
    }
}

struct SmallWidgetView: View {
    var body: some View {
        VStack(spacing: 8) {
            Text("🐕")
                .font(.largeTitle)
            Text("Kalle")
                .font(.caption)
                .foregroundColor(.secondary)
            Text("Tippen zum Loggen")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct MediumWidgetView: View {
    var body: some View {
        HStack(spacing: 0) {
            ForEach(quickActions, id: \.type) { action in
                Link(destination: URL(string: "kalletracker://add?type=\(action.type)")!) {
                    VStack(spacing: 4) {
                        Text(action.emoji)
                            .font(.title)
                        Text(action.label)
                            .font(.caption2)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
    
    var quickActions: [(type: String, emoji: String, label: String)] {
        [
            ("walk", "🚶", "Gassi"),
            ("pee", "💧", "Pipi"),
            ("poop", "💩", "Kacka"),
            ("food", "🍖", "Futter")
        ]
    }
}

@main
struct KalleWidget: Widget {
    let kind: String = "KalleWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            KalleWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Kalle Quick Add")
        .description("Schnell Einträge für Kalle hinzufügen")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemMedium) {
    KalleWidget()
} timeline: {
    KalleEntry(date: .now)
}
