import Foundation
import WatchKit

@MainActor
class EntryViewModel: ObservableObject {
    @Published var loadingType: String?
    @Published var showSuccess = false
    @Published var showError = false
    @Published var errorMessage = ""
    
    // IMPORTANT: Replace with your actual Supabase project URL
    private let baseURL = "https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1/add-entry"
    
    func addEntry(type: String) {
        loadingType = type
        
        guard var urlComponents = URLComponents(string: baseURL) else {
            handleError("Invalid URL")
            return
        }
        
        urlComponents.queryItems = [
            URLQueryItem(name: "type", value: type),
            URLQueryItem(name: "logged_by", value: "Watch")
        ]
        
        guard let url = urlComponents.url else {
            handleError("Failed to build URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        
        Task {
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    handleError("Invalid response")
                    return
                }
                
                if httpResponse.statusCode == 200 {
                    // Haptic feedback on success
                    WKInterfaceDevice.current().play(.success)
                    loadingType = nil
                    showSuccess = true
                } else {
                    let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data)
                    handleError(errorResponse?.error ?? "Server error (\(httpResponse.statusCode))")
                }
            } catch {
                handleError(error.localizedDescription)
            }
        }
    }
    
    private func handleError(_ message: String) {
        WKInterfaceDevice.current().play(.failure)
        loadingType = nil
        errorMessage = message
        showError = true
    }
}

struct ErrorResponse: Codable {
    let success: Bool
    let error: String?
}
