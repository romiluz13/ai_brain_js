"""
REAL $RANKFUSION TEST WITH MONGODB 8.1

This test validates the actual $rankFusion implementation with MongoDB 8.1
following the exact hybrid_search_docs.md specifications.
"""

import asyncio
import math
import time
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Any


class RealRankFusionTest:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.test_results = []
        
        # MongoDB 8.1 Atlas connection with $rankFusion support
        self.mongo_uri = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2js.rhcftey.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2js'

    async def setup(self):
        print('🔧 Connecting to MongoDB 8.1 Atlas...')
        
        try:
            self.client = AsyncIOMotorClient(self.mongo_uri)
            self.db = self.client.ai_brain_hybrid
            self.collection = self.db.rankfusion_test
            
            # Test connection
            await self.client.admin.command('ping')
            print('✅ Connected to MongoDB Atlas successfully')
            
            # Check MongoDB version
            build_info = await self.client.admin.command('buildInfo')
            version = build_info['version']
            print(f'📊 MongoDB Version: {version}')
            
            # Verify $rankFusion support
            version_parts = [int(x) for x in version.split('.')]
            is_rank_fusion_supported = version_parts[0] > 8 or (version_parts[0] == 8 and version_parts[1] >= 1)
            print(f'🔍 $rankFusion Support: {"✅ Supported" if is_rank_fusion_supported else "❌ Not Supported"}')
            
            return is_rank_fusion_supported
            
        except Exception as error:
            print(f'❌ Failed to connect to MongoDB Atlas: {error}')
            raise error

    async def seed_test_data(self):
        print('\n🌱 Seeding test data for hybrid search...')
        
        # Clear existing test data
        await self.collection.delete_many({})
        
        test_documents = [
            {
                '_id': 'ai_roi_1',
                'title': 'Machine Learning ROI Analysis Q3',
                'content': 'Our machine learning project achieved 150% ROI in Q3 with artificial intelligence algorithms delivering exceptional business value',
                'category': 'business',
                'tags': ['AI', 'ROI', 'machine learning', 'business', 'Q3'],
                'embedding': self.generate_semantic_embedding('machine learning ROI artificial intelligence business value algorithms')
            },
            {
                '_id': 'mobile_perf_1',
                'title': 'Mobile App Performance Metrics',
                'content': 'Mobile application downloads reached 1 million users with excellent performance metrics and user engagement rates',
                'category': 'product',
                'tags': ['mobile', 'app', 'performance', 'users', 'metrics'],
                'embedding': self.generate_semantic_embedding('mobile app performance users downloads metrics engagement')
            },
            {
                '_id': 'db_opt_1',
                'title': 'Database Optimization Results',
                'content': 'Database performance optimization reduced query time by 40% improving system efficiency and user experience',
                'category': 'technical',
                'tags': ['database', 'optimization', 'performance', 'efficiency', 'queries'],
                'embedding': self.generate_semantic_embedding('database optimization performance efficiency queries system')
            },
            {
                '_id': 'ai_success_1',
                'title': 'AI Project Success Story',
                'content': 'Artificial intelligence initiative exceeded expectations with machine learning models achieving 94% accuracy',
                'category': 'technical',
                'tags': ['AI', 'artificial intelligence', 'machine learning', 'success', 'accuracy'],
                'embedding': self.generate_semantic_embedding('artificial intelligence machine learning success accuracy models')
            },
            {
                '_id': 'customer_sat_1',
                'title': 'Customer Satisfaction Survey Results',
                'content': 'Customer satisfaction scores improved significantly after implementing new support system with AI-powered responses',
                'category': 'customer',
                'tags': ['customer', 'satisfaction', 'support', 'improvement', 'AI'],
                'embedding': self.generate_semantic_embedding('customer satisfaction support improvement AI responses')
            },
            {
                '_id': 'ml_performance_1',
                'title': 'Machine Learning Performance Benchmarks',
                'content': 'Machine learning algorithms demonstrated superior performance in processing large datasets with optimized efficiency',
                'category': 'technical',
                'tags': ['machine learning', 'performance', 'algorithms', 'datasets', 'efficiency'],
                'embedding': self.generate_semantic_embedding('machine learning performance algorithms datasets efficiency processing')
            }
        ]

        await self.collection.insert_many(test_documents)
        print(f'✅ Inserted {len(test_documents)} test documents')

    async def test_real_rankfusion_hybrid_search(self):
        print('\n🧪 Testing REAL $rankFusion Hybrid Search...')

        test_cases = [
            {
                'name': 'AI Machine Learning Performance Query',
                'text_query': 'machine learning performance artificial intelligence',
                'vector_query': self.generate_semantic_embedding('machine learning performance artificial intelligence'),
                'expected_docs': ['ai_roi_1', 'ai_success_1', 'ml_performance_1'],
                'vector_weight': 0.7,
                'text_weight': 0.3
            },
            {
                'name': 'Performance Optimization Query',
                'text_query': 'performance optimization efficiency',
                'vector_query': self.generate_semantic_embedding('performance optimization efficiency'),
                'expected_docs': ['db_opt_1', 'mobile_perf_1', 'ml_performance_1'],
                'vector_weight': 0.6,
                'text_weight': 0.4
            },
            {
                'name': 'Customer AI Support Query',
                'text_query': 'customer support AI satisfaction',
                'vector_query': self.generate_semantic_embedding('customer support AI satisfaction'),
                'expected_docs': ['customer_sat_1', 'ai_success_1'],
                'vector_weight': 0.5,
                'text_weight': 0.5
            }
        ]

        for test_case in test_cases:
            try:
                print(f'\n📊 {test_case["name"]}:')
                print(f'   Text Query: "{test_case["text_query"]}"')
                print(f'   Weights: Vector {test_case["vector_weight"]}, Text {test_case["text_weight"]}')

                # CORRECT $rankFusion pipeline (NO $project in sub-pipelines!)
                rank_fusion_pipeline = [
                    {
                        '$rankFusion': {
                            'input': {
                                'pipelines': {
                                    'vectorPipeline': [
                                        {
                                            '$vectorSearch': {
                                                'index': 'vector_search_index',
                                                'path': 'embedding',
                                                'queryVector': test_case['vector_query'],
                                                'numCandidates': 50,
                                                'limit': 20
                                            }
                                        }
                                    ],
                                    'textPipeline': [
                                        {
                                            '$search': {
                                                'index': 'text_search_index',
                                                'text': {
                                                    'query': test_case['text_query'],
                                                    'path': ['title', 'content', 'tags']
                                                }
                                            }
                                        },
                                        {'$limit': 20}
                                    ]
                                }
                            },
                            'combination': {
                                'weights': {
                                    'vectorPipeline': test_case['vector_weight'],
                                    'textPipeline': test_case['text_weight']
                                }
                            },
                            'scoreDetails': True
                        }
                    },
                    {
                        '$project': {
                            '_id': 1,
                            'title': 1,
                            'content': 1,
                            'category': 1,
                            'tags': 1,
                            'hybridScore': {'$meta': 'scoreDetails'}
                        }
                    },
                    {'$limit': 10}
                ]

                # Execute $rankFusion hybrid search
                hybrid_results = await self.collection.aggregate(rank_fusion_pipeline).to_list(length=None)
                
                print(f'   🔥 $rankFusion Results: {len(hybrid_results)} found')
                for index, result in enumerate(hybrid_results):
                    score_details = result.get('hybridScore', {})
                    total_score = score_details.get('value', 0)
                    
                    print(f'     {index + 1}. {result["_id"]}: "{result["title"]}"')
                    print(f'        Total Score: {total_score:.4f}')
                    
                    # Show individual pipeline scores if available
                    if 'details' in score_details:
                        details = score_details['details']
                        vector_score = details.get('vectorPipeline', {}).get('value', 0)
                        text_score = details.get('textPipeline', {}).get('value', 0)
                        print(f'        Vector: {vector_score:.4f}, Text: {text_score:.4f}')

                # Compare with individual searches
                await self._compare_individual_searches(test_case)

                # Validate results
                found_expected = any(
                    expected_id in [result['_id'] for result in hybrid_results]
                    for expected_id in test_case['expected_docs']
                )

                passed = len(hybrid_results) > 0 and found_expected

                self.test_results.append({
                    'test': test_case['name'],
                    'passed': passed,
                    'details': {
                        'hybrid_count': len(hybrid_results),
                        'found_expected': found_expected,
                        'top_score': hybrid_results[0].get('hybridScore', {}).get('value', 0) if hybrid_results else 0
                    }
                })

                print(f'   Result: {"✅ PASSED" if passed else "❌ FAILED"}')

            except Exception as error:
                print(f'   Result: ❌ ERROR - {error}')
                self.test_results.append({
                    'test': test_case['name'],
                    'passed': False,
                    'details': {'error': str(error)}
                })

    async def _compare_individual_searches(self, test_case):
        """Compare $rankFusion with individual vector and text searches."""
        try:
            # Vector search only
            vector_results = await self.collection.aggregate([
                {
                    '$vectorSearch': {
                        'index': 'vector_search_index',
                        'path': 'embedding',
                        'queryVector': test_case['vector_query'],
                        'numCandidates': 50,
                        'limit': 5
                    }
                },
                {
                    '$project': {
                        '_id': 1,
                        'title': 1,
                        'score': {'$meta': 'vectorSearchScore'}
                    }
                }
            ]).to_list(length=None)

            print(f'   📊 Vector Only: {len(vector_results)} results')

            # Text search only
            text_results = await self.collection.aggregate([
                {
                    '$search': {
                        'index': 'text_search_index',
                        'text': {
                            'query': test_case['text_query'],
                            'path': ['title', 'content', 'tags']
                        }
                    }
                },
                {
                    '$project': {
                        '_id': 1,
                        'title': 1,
                        'score': {'$meta': 'searchScore'}
                    }
                },
                {'$limit': 5}
            ]).to_list(length=None)

            print(f'   📊 Text Only: {len(text_results)} results')

        except Exception as error:
            print(f'   ⚠️  Individual search comparison failed: {error}')

    def generate_semantic_embedding(self, text: str) -> List[float]:
        """Generate a semantic embedding that creates meaningful clusters."""
        words = text.lower().split()
        embedding = [0.0] * 1536  # OpenAI embedding dimension
        
        # Create semantic clusters for related concepts
        semantic_clusters = {
            'ai_ml': ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'algorithms', 'models'],
            'performance': ['performance', 'optimization', 'efficiency', 'speed', 'metrics'],
            'business': ['business', 'roi', 'value', 'revenue', 'profit', 'success'],
            'customer': ['customer', 'satisfaction', 'support', 'user', 'experience'],
            'technical': ['database', 'system', 'query', 'processing', 'data']
        }
        
        for word in words:
            # Find which cluster this word belongs to
            for cluster_name, cluster_words in semantic_clusters.items():
                if word in cluster_words:
                    cluster_hash = self.simple_hash(cluster_name)
                    # Add strong signal for this cluster
                    for i in range(0, 1536, 5):
                        if i + 4 < 1536:
                            embedding[i:i+5] = [math.sin(cluster_hash + j) * 0.3 for j in range(5)]
            
            # Add word-specific signal
            word_hash = self.simple_hash(word)
            for i in range(len(word) % 100, 1536, 100):
                if i < 1536:
                    embedding[i] += math.sin(word_hash + i) * 0.1
        
        # Normalize
        magnitude = math.sqrt(sum(val * val for val in embedding))
        if magnitude > 0:
            embedding = [val / magnitude for val in embedding]
        
        return embedding

    def simple_hash(self, s: str) -> int:
        """Simple hash function for strings."""
        hash_val = 0
        for char in s:
            hash_val = ((hash_val << 5) - hash_val) + ord(char)
            hash_val = hash_val & 0xFFFFFFFF
        return hash_val

    async def run_all_tests(self):
        try:
            is_supported = await self.setup()
            
            if not is_supported:
                print('\n⚠️  $rankFusion is not supported on this MongoDB version')
                return

            await self.seed_test_data()
            print('\n⏳ Note: Search indexes need to be created manually in Atlas UI')
            print('   Vector Index: "vector_search_index" on field "embedding"')
            print('   Text Index: "text_search_index" on fields "title", "content", "tags"')
            
            await self.test_real_rankfusion_hybrid_search()
            
            self.print_summary()
        except Exception as error:
            print(f'❌ Test suite failed: {error}')
        finally:
            if self.client:
                self.client.close()

    def print_summary(self):
        print('\n' + '=' * 60)
        print('📊 REAL $RANKFUSION HYBRID SEARCH TEST SUMMARY')
        print('=' * 60)

        passed = len([r for r in self.test_results if r['passed']])
        total = len(self.test_results)
        percentage = (passed / total * 100) if total > 0 else 0

        print(f'\n✅ Passed: {passed}/{total} ({percentage:.1f}%)')
        print(f'❌ Failed: {total - passed}/{total}')

        print('\n📋 Detailed Results:')
        for result in self.test_results:
            status = '✅' if result['passed'] else '❌'
            print(f'   {status} {result["test"]}')
            if not result['passed'] and 'error' in result['details']:
                print(f'      Error: {result["details"]["error"]}')

        if percentage >= 80:
            print('\n🎉 MONGODB 8.1 $RANKFUSION IS WORKING!')
            print('🚀 Real hybrid search with reciprocal rank fusion confirmed!')
            print('💡 Ready to implement in all AI Brain systems!')
        else:
            print('\n⚠️  Some tests failed - check search indexes in Atlas UI')


# Run the test
if __name__ == "__main__":
    test = RealRankFusionTest()
    asyncio.run(test.run_all_tests())
