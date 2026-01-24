package com.kalletracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import kotlinx.coroutines.*
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
        
        val entryType = intent.getStringExtra(EXTRA_ENTRY_TYPE)
        if (entryType != null) {
            // Log entry in background
            CoroutineScope(Dispatchers.IO).launch {
                logEntry(entryType)
            }
        }
    }

    companion object {
        const val ACTION_LOG_ENTRY = "com.kalletracker.ACTION_LOG_ENTRY"
        const val EXTRA_ENTRY_TYPE = "entry_type"
        
        private const val BASE_URL = "https://sywgjwxtuijrdmekxquj.supabase.co/functions/v1/add-entry"
        
        private suspend fun logEntry(type: String) {
            withContext(Dispatchers.IO) {
                try {
                    val url = URL("$BASE_URL?type=$type&logged_by=Widget")
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 10000
                    
                    val responseCode = connection.responseCode
                    connection.disconnect()
                    
                    // Could show toast or notification on success/failure
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.kalle_widget)
            
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
