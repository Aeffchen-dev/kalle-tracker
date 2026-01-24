package com.kalletracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class KalleWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_LOG_ENTRY -> {
                val entryType = intent.getStringExtra(EXTRA_ENTRY_TYPE)
                if (entryType != null) {
                    CoroutineScope(Dispatchers.IO).launch {
                        logEntry(entryType)
                    }
                }
            }
            ACTION_REFRESH -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS)
                appWidgetIds?.forEach { appWidgetId ->
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }

    companion object {
        const val ACTION_LOG_ENTRY = "com.kalletracker.ACTION_LOG_ENTRY"
        const val ACTION_REFRESH = "com.kalletracker.ACTION_REFRESH"
        const val EXTRA_ENTRY_TYPE = "entry_type"
        
        private const val BASE_URL = "https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1"
        
        private suspend fun logEntry(type: String) {
            withContext(Dispatchers.IO) {
                try {
                    val url = URL("$BASE_URL/add-entry?type=$type&logged_by=Widget")
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 10000
                    connection.responseCode
                    connection.disconnect()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        
        private suspend fun fetchTimerStatus(): TimerData {
            return withContext(Dispatchers.IO) {
                try {
                    val url = URL("$BASE_URL/timer-status")
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 10000
                    
                    val responseCode = connection.responseCode
                    if (responseCode == 200) {
                        val response = connection.inputStream.bufferedReader().readText()
                        val json = JSONObject(response)
                        TimerData(
                            displayText = json.optString("display_text", "00min"),
                            isOverdue = json.optBoolean("is_overdue", false),
                            countdownMode = json.optString("countdown_mode", "count_up")
                        )
                    } else {
                        TimerData("--", false, "count_up")
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    TimerData("--", false, "count_up")
                }
            }
        }
        
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            CoroutineScope(Dispatchers.IO).launch {
                val timerData = fetchTimerStatus()
                
                withContext(Dispatchers.Main) {
                    val views = RemoteViews(context.packageName, R.layout.kalle_widget)
                    
                    // Update timer display
                    views.setTextViewText(R.id.timer_text, timerData.displayText)
                    views.setTextColor(
                        R.id.timer_text, 
                        if (timerData.isOverdue) Color.parseColor("#FF4444") else Color.WHITE
                    )
                    
                    // Update subtitle based on countdown mode
                    val subtitle = if (timerData.countdownMode == "count_up") "seit Gassi" else "bis Gassi"
                    views.setTextViewText(R.id.timer_subtitle, subtitle)
                    
                    // Set up click intents for each button
                    val entryTypes = listOf("walk", "pee", "poop", "food")
                    val buttonIds = listOf(
                        R.id.btn_walk,
                        R.id.btn_pee,
                        R.id.btn_poop,
                        R.id.btn_food
                    )
                    
                    entryTypes.forEachIndexed { index, type ->
                        val intent = Intent(context, KalleWidgetProvider::class.java).apply {
                            action = ACTION_LOG_ENTRY
                            putExtra(EXTRA_ENTRY_TYPE, type)
                        }
                        val pendingIntent = PendingIntent.getBroadcast(
                            context,
                            index,
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        views.setOnClickPendingIntent(buttonIds[index], pendingIntent)
                    }
                    
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            }
        }
    }
    
    data class TimerData(
        val displayText: String,
        val isOverdue: Boolean,
        val countdownMode: String
    )
}
