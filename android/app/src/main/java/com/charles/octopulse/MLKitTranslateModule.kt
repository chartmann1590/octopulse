package com.charles.octopulse

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions

class MLKitTranslateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // Cache translators per language pair to avoid recreation overhead
    private val translators = mutableMapOf<String, Translator>()

    override fun getName(): String = "MLKitTranslate"

    private fun pairKey(source: String, target: String) = "$source-$target"

    private fun toMLKitCode(code: String): String {
        // Normalize incoming BCP47 to MLKit TranslateLanguage codes
        val normalized = code.lowercase().substringBefore("-").substringBefore("_")
        return when (normalized) {
            "zh", "zh-cn", "zh-hans", "zh-tw", "zh-hant" -> TranslateLanguage.CHINESE
            "en" -> TranslateLanguage.ENGLISH
            "es" -> TranslateLanguage.SPANISH
            "fr" -> TranslateLanguage.FRENCH
            "de" -> TranslateLanguage.GERMAN
            "ja" -> TranslateLanguage.JAPANESE
            "ko" -> TranslateLanguage.KOREAN
            "pt", "pt-br", "pt-pt" -> TranslateLanguage.PORTUGUESE
            "ru" -> TranslateLanguage.RUSSIAN
            "ar" -> TranslateLanguage.ARABIC
            "hi" -> TranslateLanguage.HINDI
            "it" -> TranslateLanguage.ITALIAN
            "nl" -> TranslateLanguage.DUTCH
            "tr" -> TranslateLanguage.TURKISH
            "pl" -> TranslateLanguage.POLISH
            "uk" -> TranslateLanguage.UKRAINIAN
            "vi" -> TranslateLanguage.VIETNAMESE
            "th" -> TranslateLanguage.THAI
            "sv" -> TranslateLanguage.SWEDISH
            "no", "nb" -> TranslateLanguage.NORWEGIAN
            "da" -> TranslateLanguage.DANISH
            "fi" -> TranslateLanguage.FINNISH
            "cs" -> TranslateLanguage.CZECH
            "el" -> TranslateLanguage.GREEK
            "he", "iw" -> TranslateLanguage.HEBREW
            "id" -> TranslateLanguage.INDONESIAN
            "ms" -> TranslateLanguage.MALAY
            else -> normalized
        }
    }

    private fun getOrCreateTranslator(source: String, target: String): Translator {
        val s = toMLKitCode(source)
        val t = toMLKitCode(target)
        val key = pairKey(s, t)
        translators[key]?.let { return it }

        val options = TranslatorOptions.Builder()
            .setSourceLanguage(s)
            .setTargetLanguage(t)
            .build()
        val translator = Translation.getClient(options)
        translators[key] = translator
        return translator
    }

    @ReactMethod
    fun downloadModel(source: String, target: String, promise: Promise) {
        try {
            val translator = getOrCreateTranslator(source, target)
            val conditions = DownloadConditions.Builder().build()
            translator.downloadModelIfNeeded(conditions)
                .addOnSuccessListener {
                    promise.resolve(true)
                }
                .addOnFailureListener { e ->
                    promise.reject("DOWNLOAD_FAILED", e.message ?: "Failed to download ML Kit model", e)
                }
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun deleteModel(source: String, target: String, promise: Promise) {
        try {
            val s = toMLKitCode(source)
            val t = toMLKitCode(target)
            val key = pairKey(s, t)
            translators[key]?.close()
            translators.remove(key)

            val model = TranslateRemoteModel.Builder(t).build()
            RemoteModelManager.getInstance().deleteDownloadedModel(model)
                .addOnSuccessListener {
                    promise.resolve(true)
                }
                .addOnFailureListener {
                    promise.resolve(false)
                }
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isModelDownloaded(source: String, target: String, promise: Promise) {
        try {
            val t = toMLKitCode(target)
            if (t == TranslateLanguage.ENGLISH) {
                promise.resolve(true)
                return
            }
            val model = TranslateRemoteModel.Builder(t).build()
            RemoteModelManager.getInstance().isModelDownloaded(model)
                .addOnSuccessListener { downloaded ->
                    promise.resolve(downloaded)
                }
                .addOnFailureListener {
                    promise.resolve(false)
                }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun translate(text: String, source: String, target: String, promise: Promise) {
        try {
            if (source.lowercase() == target.lowercase()) {
                promise.resolve(text)
                return
            }
            if (text.isBlank()) {
                promise.resolve(text)
                return
            }
            // Split very long texts to avoid MLKit 400-token limit issues (approx 512 chars safe chunks)
            // For simplicity we translate entire string; MLKit handles paragraph lengths.
            val translator = getOrCreateTranslator(source, target)
            translator.translate(text)
                .addOnSuccessListener { translated ->
                    promise.resolve(translated)
                }
                .addOnFailureListener { e ->
                    promise.reject("TRANSLATE_FAILED", e.message ?: "Translation failed", e)
                }
        } catch (e: Exception) {
            promise.reject("TRANSLATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun translateBatch(texts: com.facebook.react.bridge.ReadableArray, source: String, target: String, promise: Promise) {
        // Batch helper - translates array sequentially to avoid overloading native
        try {
            if (source.lowercase() == target.lowercase()) {
                promise.resolve(texts)
                return
            }
            val translator = getOrCreateTranslator(source, target)
            val results = com.facebook.react.bridge.Arguments.createArray()
            val list = mutableListOf<String>()
            for (i in 0 until texts.size()) {
                list.add(texts.getString(i) ?: "")
            }
            translateSequentially(translator, list, 0, results, promise)
        } catch (e: Exception) {
            promise.reject("BATCH_ERROR", e.message, e)
        }
    }

    private fun translateSequentially(translator: Translator, texts: List<String>, index: Int, results: com.facebook.react.bridge.WritableArray, promise: Promise) {
        if (index >= texts.size) {
            promise.resolve(results)
            return
        }
        val text = texts[index]
        if (text.isBlank()) {
            results.pushString(text)
            translateSequentially(translator, texts, index + 1, results, promise)
            return
        }
        translator.translate(text)
            .addOnSuccessListener { translated ->
                results.pushString(translated)
                translateSequentially(translator, texts, index + 1, results, promise)
            }
            .addOnFailureListener { e ->
                // On failure, push original to avoid blocking whole batch
                results.pushString(text)
                translateSequentially(translator, texts, index + 1, results, promise)
            }
    }
}
