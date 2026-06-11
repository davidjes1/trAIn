package com.davidjes.train.di

import com.davidjes.train.data.ai.AiCoreGeminiService
import com.davidjes.train.domain.ai.GeminiService
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Binds the assistant to the on-device Gemini Nano implementation
 * ([AiCoreGeminiService]), which itself falls back to the deterministic
 * RuleBasedGeminiService whenever the model is unavailable or a call fails.
 * To force the rule-based path everywhere, bind RuleBasedGeminiService here instead.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class AiModule {
    @Binds
    @Singleton
    abstract fun bindGeminiService(impl: AiCoreGeminiService): GeminiService
}
