import WidgetKit
import SwiftUI

struct TimerData: Codable {
    let success: Bool
    let countdown_mode: String?
    let display_text: String?
    let is_overdue: Bool?
}

struct KalleEntry: TimelineEntry {
    let date: Date
    let displayText: String
    let isOverdue: Bool
    let countdownMode: String
}

struct Provider: TimelineProvider {
    private let baseURL = "https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1/timer-status"
    
    func placeholder(in context: Context) -> KalleEntry {
        KalleEntry(date: Date(), displayText: "00min", isOverdue: false, countdownMode: "count_up")
    }

    func getSnapshot(in context: Context, completion: @escaping (KalleEntry) -> ()) {
        completion(KalleEntry(date: Date(), displayText: "00min", isOverdue: false, countdownMode: "count_up"))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KalleEntry>) -> ()) {
        Task {
            do {
                let timerData = try await fetchTimerStatus()
                let entry = KalleEntry(
                    date: Date(),
                    displayText: timerData.display_text ?? "00min",
                    isOverdue: timerData.is_overdue ?? false,
                    countdownMode: timerData.countdown_mode ?? "count_up"
                )
                // Refresh every 5 minutes
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            } catch {
                let entry = KalleEntry(date: Date(), displayText: "--", isOverdue: false, countdownMode: "count_up")
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            }
        }
    }
    
    private func fetchTimerStatus() async throws -> TimerData {
        guard let url = URL(string: baseURL) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TimerData.self, from: data)
    }
}

struct KalleWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    let entry: KalleEntry
    
    var body: some View {
        VStack(spacing: 6) {
            Text("🐕")
                .font(.title)
            Text(entry.displayText)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(entry.isOverdue ? .red : .primary)
            Text(entry.countdownMode == "count_up" ? "seit Gassi" : "bis Gassi")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct MediumWidgetView: View {
    let entry: KalleEntry
    
    let quickActions: [(type: String, emoji: String, label: String)] = [
        ("walk", "🚶", "Gassi"),
        ("pee", "💧", "Pipi"),
        ("poop", "💩", "Kacka"),
        ("food", "🍖", "Futter")
    ]
    
    var body: some View {
        HStack(spacing: 12) {
            // Timer display
            VStack(spacing: 4) {
                Text("🐕")
                    .font(.title2)
                Text(entry.displayText)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(entry.isOverdue ? .red : .primary)
                Text(entry.countdownMode == "count_up" ? "seit Gassi" : "bis Gassi")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            
            Divider()
            
            // Quick action buttons
            HStack(spacing: 8) {
                ForEach(quickActions, id: \.type) { action in
                    Link(destination: URL(string: "kalletracker://add?type=\(action.type)")!) {
                        VStack(spacing: 2) {
                            Text(action.emoji)
                                .font(.title3)
                            Text(action.label)
                                .font(.caption2)
                                .foregroundColor(.primary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 8)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct KalleWidget: Widget {
    let kind: String = "KalleWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            KalleWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Kalle Timer")
        .description("Zeigt die Zeit seit/bis zum nächsten Gassi")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    KalleWidget()
} timeline: {
    KalleEntry(date: .now, displayText: "45min", isOverdue: false, countdownMode: "count_up")
    KalleEntry(date: .now, displayText: "Jetzt!", isOverdue: true, countdownMode: "count_down")
}

#Preview(as: .systemMedium) {
    KalleWidget()
} timeline: {
    KalleEntry(date: .now, displayText: "1h 30min", isOverdue: false, countdownMode: "count_up")
}
