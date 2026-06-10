package com.davidjes.train.di

import com.davidjes.train.data.ai.RuleBasedGeminiService
import com.davidjes.train.domain.ai.GeminiService
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Binds the assistant. Swap [RuleBasedGeminiService] for an on-device Gemini Nano
 * implementation (Google AI Edge / AICore) here when targeting supported devices —
 * no screen or ViewModel changes needed.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class AiModule {
    @Binds
    @Singleton
    abstract fun bindGeminiService(impl: RuleBasedGeminiService): GeminiService
}
