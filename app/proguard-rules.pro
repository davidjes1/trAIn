# Keep Health Connect records (reflection-based serialization in some paths)
-keep class androidx.health.connect.client.records.** { *; }

# Room — generated code is safe; keep entities annotated fields
-keep class com.davidjes.train.data.local.** { *; }

# ML Kit GenAI
-keep class com.google.mlkit.genai.** { *; }
