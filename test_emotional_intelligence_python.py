"""
COMPREHENSIVE TEST SUITE FOR EMOTIONAL INTELLIGENCE ENGINE (PYTHON)

This test suite validates the complete functionality of the EmotionalIntelligenceEngine
by testing real emotional analysis, pattern matching, and response generation.
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient

# Add the AI Brain Python path
sys.path.append('AI_Brain-python_3')

from ai_brain_python.core.cognitive_systems.emotional_intelligence import (
    EmotionalIntelligenceEngine,
    EmotionalContext,
    EmotionDetectionResult
)


class EmotionalIntelligenceTest:
    def __init__(self):
        self.db = None
        self.engine = None
        self.test_results = []

    async def setup(self):
        print('🔧 Setting up EmotionalIntelligenceEngine test...')
        
        # Connect to MongoDB (use test database)
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongodb_uri)
        self.db = client.ai_brain_test
        
        # Initialize engine
        self.engine = EmotionalIntelligenceEngine(self.db)
        await self.engine.initialize()
        
        print('✅ Setup complete')

    async def test_emotion_detection(self):
        print('\n🧪 Testing Emotion Detection...')
        
        test_cases = [
            {
                'name': 'Joy Detection',
                'input': 'I am so happy and excited about this amazing project!',
                'expected_primary': 'joy',
                'expected_valence': 'positive'
            },
            {
                'name': 'Anger Detection',
                'input': 'I am really frustrated and angry about this terrible situation!',
                'expected_primary': 'anger',
                'expected_valence': 'negative'
            },
            {
                'name': 'Fear Detection',
                'input': 'I am scared and worried about what might happen next.',
                'expected_primary': 'fear',
                'expected_valence': 'negative'
            },
            {
                'name': 'Neutral Detection',
                'input': 'The weather is cloudy today.',
                'expected_primary': 'neutral',
                'expected_valence': 'neutral'
            },
            {
                'name': 'Mixed Emotions',
                'input': 'I am excited but also nervous about the presentation tomorrow.',
                'expected_primary': ['anticipation', 'fear'],  # Could be either
                'expected_valence': 'mixed'
            }
        ]

        for test_case in test_cases:
            try:
                context = EmotionalContext(
                    agent_id='test-agent',
                    session_id='test-session',
                    input=test_case['input'],
                    conversation_history=[],
                    task_context={'type': 'general'},
                    user_context={'mood': 'neutral'}
                )

                result = await self.engine.detect_emotion(context)
                
                print(f"\n📊 {test_case['name']}:")
                print(f"   Input: \"{test_case['input']}\"")
                print(f"   Detected: {result.primary} (intensity: {result.intensity:.2f})")
                print(f"   Valence: {result.valence:.2f}")
                print(f"   Arousal: {result.arousal:.2f}")
                print(f"   Dominance: {result.dominance:.2f}")
                print(f"   Confidence: {result.confidence:.2f}")

                # Validate results
                passed = True
                if isinstance(test_case['expected_primary'], list):
                    passed = result.primary in test_case['expected_primary']
                else:
                    passed = result.primary == test_case['expected_primary']

                # Validate valence direction
                if test_case['expected_valence'] == 'positive' and result.valence <= 0:
                    passed = False
                if test_case['expected_valence'] == 'negative' and result.valence >= 0:
                    passed = False
                if test_case['expected_valence'] == 'neutral' and abs(result.valence) > 0.3:
                    passed = False

                self.test_results.append({
                    'test': test_case['name'],
                    'passed': passed,
                    'details': {'expected': test_case['expected_primary'], 'actual': result.primary}
                })

                print(f"   Result: {'✅ PASSED' if passed else '❌ FAILED'}")

            except Exception as error:
                print(f"   Result: ❌ ERROR - {str(error)}")
                self.test_results.append({
                    'test': test_case['name'],
                    'passed': False,
                    'details': {'error': str(error)}
                })

    async def test_emotional_state_processing(self):
        print('\n🧪 Testing Emotional State Processing...')

        try:
            context = EmotionalContext(
                agent_id='test-agent',
                session_id='test-session',
                input='I just completed a challenging project successfully!',
                conversation_history=[],
                task_context={'type': 'project_completion'},
                user_context={'mood': 'neutral'}
            )

            # First detect emotion
            detected_emotion = await self.engine.detect_emotion(context)
            
            # Then process emotional state
            emotional_response = await self.engine.process_emotional_state(
                context,
                detected_emotion,
                'project_completion',
                'task_completion'
            )

            print('\n📊 Emotional State Processing:')
            print(f"   Detected Emotion: {detected_emotion.primary}")
            print(f"   Response Style: {emotional_response.response_guidance.style}")
            print(f"   Empathy Level: {emotional_response.response_guidance.empathy_level}")
            print(f"   Cognitive Effects:")
            print(f"     Attention: {emotional_response.cognitive_effects.attention_modification:.2f}")
            print(f"     Memory: {emotional_response.cognitive_effects.memory_strength:.2f}")
            print(f"     Decision: {emotional_response.cognitive_effects.decision_bias:.2f}")

            # Validate response
            passed = (emotional_response.response_guidance.style is not None and
                     emotional_response.cognitive_effects.attention_modification is not None)

            self.test_results.append({
                'test': 'Emotional State Processing',
                'passed': passed,
                'details': {'response_style': emotional_response.response_guidance.style}
            })

            print(f"   Result: {'✅ PASSED' if passed else '❌ FAILED'}")

        except Exception as error:
            print(f"   Result: ❌ ERROR - {str(error)}")
            self.test_results.append({
                'test': 'Emotional State Processing',
                'passed': False,
                'details': {'error': str(error)}
            })

    async def test_emotional_pattern_analysis(self):
        print('\n🧪 Testing Emotional Pattern Analysis...')

        try:
            # Simulate multiple emotional interactions
            interactions = [
                'I am excited about this new opportunity!',
                'This is really frustrating me.',
                'I feel confident about the solution.',
                'I am worried about the deadline.',
                'This is absolutely fantastic!'
            ]

            for input_text in interactions:
                context = EmotionalContext(
                    agent_id='test-agent',
                    session_id='pattern-test-session',
                    input=input_text,
                    conversation_history=[],
                    task_context={'type': 'general'},
                    user_context={'mood': 'neutral'}
                )

                emotion = await self.engine.detect_emotion(context)
                await self.engine.process_emotional_state(context, emotion, input_text, 'user_input')

            # Analyze patterns
            patterns = await self.engine.analyze_emotional_patterns('test-agent', 1)

            print('\n📊 Emotional Pattern Analysis:')
            print(f"   Dominant Emotions: {', '.join(patterns.get('dominant_emotions', []))}")
            print(f"   Emotional Stability: {patterns.get('emotional_stability', 0):.2f}")
            print(f"   Pattern Insights: {len(patterns.get('insights', []))} insights found")

            passed = (len(patterns.get('dominant_emotions', [])) > 0 and
                     patterns.get('emotional_stability', 0) >= 0 and
                     len(patterns.get('insights', [])) >= 0)

            self.test_results.append({
                'test': 'Emotional Pattern Analysis',
                'passed': passed,
                'details': {'dominant_emotions': patterns.get('dominant_emotions', [])}
            })

            print(f"   Result: {'✅ PASSED' if passed else '❌ FAILED'}")

        except Exception as error:
            print(f"   Result: ❌ ERROR - {str(error)}")
            self.test_results.append({
                'test': 'Emotional Pattern Analysis',
                'passed': False,
                'details': {'error': str(error)}
            })

    async def test_real_world_scenarios(self):
        print('\n🧪 Testing Real-World Scenarios...')

        scenarios = [
            {
                'name': 'Customer Support - Angry Customer',
                'input': 'This is absolutely ridiculous! Your service is terrible and I want my money back!',
                'expected_response': 'empathetic',
                'expected_intensity': 'high'
            },
            {
                'name': 'Project Management - Success',
                'input': 'We just hit all our milestones ahead of schedule! The team is amazing!',
                'expected_response': 'celebratory',
                'expected_intensity': 'high'
            },
            {
                'name': 'Technical Support - Confusion',
                'input': 'I am not sure how to configure this setting. Can you help me understand?',
                'expected_response': 'helpful',
                'expected_intensity': 'low'
            }
        ]

        for scenario in scenarios:
            try:
                context = EmotionalContext(
                    agent_id='test-agent',
                    session_id=f"scenario-{scenario['name'].replace(' ', '-')}",
                    input=scenario['input'],
                    conversation_history=[],
                    task_context={'type': 'customer_interaction'},
                    user_context={'mood': 'neutral'}
                )

                emotion = await self.engine.detect_emotion(context)
                response = await self.engine.process_emotional_state(context, emotion, scenario['input'], 'user_input')

                print(f"\n📊 {scenario['name']}:")
                print(f"   Input: \"{scenario['input']}\"")
                print(f"   Emotion: {emotion.primary} ({emotion.intensity:.2f})")
                print(f"   Response Style: {response.response_guidance.style}")
                print(f"   Empathy Level: {response.response_guidance.empathy_level}")

                # Basic validation - emotion should be detected with reasonable intensity
                passed = emotion.primary != 'neutral' or emotion.intensity > 0.1

                self.test_results.append({
                    'test': scenario['name'],
                    'passed': passed,
                    'details': {'emotion': emotion.primary, 'intensity': emotion.intensity}
                })

                print(f"   Result: {'✅ PASSED' if passed else '❌ FAILED'}")

            except Exception as error:
                print(f"   Result: ❌ ERROR - {str(error)}")
                self.test_results.append({
                    'test': scenario['name'],
                    'passed': False,
                    'details': {'error': str(error)}
                })

    async def run_all_tests(self):
        try:
            await self.setup()
            await self.test_emotion_detection()
            await self.test_emotional_state_processing()
            await self.test_emotional_pattern_analysis()
            await self.test_real_world_scenarios()
            
            self.print_summary()
        except Exception as error:
            print(f'❌ Test suite failed: {error}')

    def print_summary(self):
        print('\n' + '=' * 60)
        print('📊 EMOTIONAL INTELLIGENCE ENGINE TEST SUMMARY (PYTHON)')
        print('=' * 60)

        passed = len([r for r in self.test_results if r['passed']])
        total = len(self.test_results)
        percentage = (passed / total * 100) if total > 0 else 0

        print(f"\n✅ Passed: {passed}/{total} ({percentage:.1f}%)")
        print(f"❌ Failed: {total - passed}/{total}")

        print('\n📋 Detailed Results:')
        for result in self.test_results:
            status = '✅' if result['passed'] else '❌'
            print(f"   {status} {result['test']}")
            if not result['passed'] and 'error' in result['details']:
                print(f"      Error: {result['details']['error']}")

        if percentage >= 80:
            print('\n🎉 PYTHON EMOTIONAL INTELLIGENCE ENGINE IS WORKING CORRECTLY!')
        else:
            print('\n⚠️  PYTHON EMOTIONAL INTELLIGENCE ENGINE NEEDS ATTENTION!')


# Run the test
if __name__ == "__main__":
    test = EmotionalIntelligenceTest()
    asyncio.run(test.run_all_tests())
