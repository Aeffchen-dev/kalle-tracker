import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = EntryViewModel()
    
    let entryTypes: [(type: String, emoji: String, label: String)] = [
        ("walk", "🚶", "Gassi"),
        ("pee", "💧", "Pipi"),
        ("poop", "💩", "Kacka"),
        ("food", "🍖", "Futter")
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Kalle")
                    .font(.headline)
                    .foregroundColor(.white)
                
                ForEach(entryTypes, id: \.type) { entry in
                    Button(action: {
                        viewModel.addEntry(type: entry.type)
                    }) {
                        HStack {
                            Text(entry.emoji)
                                .font(.title2)
                            Text(entry.label)
                                .font(.body)
                            Spacer()
                            if viewModel.loadingType == entry.type {
                                ProgressView()
                                    .tint(.white)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                    .disabled(viewModel.loadingType != nil)
                }
            }
            .padding()
        }
        .alert("Gespeichert! ✓", isPresented: $viewModel.showSuccess) {
            Button("OK", role: .cancel) {}
        }
        .alert("Fehler", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
    }
}

#Preview {
    ContentView()
}
