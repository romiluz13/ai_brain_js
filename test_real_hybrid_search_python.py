"""
REAL MONGODB ATLAS HYBRID SEARCH TEST (PYTHON)

This test validates the actual $rankFusion implementation with real MongoDB Atlas
using the provided connection string and testing real hybrid search capabilities.
"""

import asyncio
import math
import time
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Any


class RealHybridSearchTest:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.test_results = []
        
        # Real MongoDB Atlas connection (8.1 with $rankFusion support!)
        self.mongo_uri = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2js.rhcftey.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2js'

    async def setup(self):
        print('🔧 Connecting to MongoDB Atlas...')
        
        try:
            self.client = AsyncIOMotorClient(self.mongo_uri)
            self.db = self.client.ai_brain_test
            self.collection = self.db.hybrid_search_test
            
            # Test connection
            await self.client.admin.command('ping')
            print('✅ Connected to MongoDB Atlas successfully')
            
            # Check MongoDB version
            build_info = await self.client.admin.command('buildInfo')
            version = build_info['version']
            print(f'📊 MongoDB Version: {version}')
            
            # Check if $rankFusion is supported (MongoDB 8.1+)
            version_parts = [int(x) for x in version.split('.')]
            is_rank_fusion_supported = version_parts[0] > 8 or (version_parts[0] == 8 and version_parts[1] >= 1)
            print(f'🔍 $rankFusion Support: {"✅ Supported" if is_rank_fusion_supported else "❌ Not Supported"}')
            
            return is_rank_fusion_supported
            
        except Exception as error:
            print(f'❌ Failed to connect to MongoDB Atlas: {error}')
            raise error

    async def seed_test_data(self):
        print('\n🌱 Seeding test data...')
        
        # Clear existing test data
        await self.collection.delete_many({})
        
        test_documents = [
            {
                '_id': 'doc1',
                'title': 'Machine Learning ROI Analysis',
                'content': 'Our machine learning project achieved 150% ROI in Q3 with artificial intelligence algorithms',
                'category': 'business',
                'tags': ['AI', 'ROI', 'machine learning', 'business'],
                'embedding': self.generate_mock_embedding('machine learning ROI artificial intelligence')
            },
            {
                '_id': 'doc2',
                'title': 'Mobile App Performance',
                'content': 'Mobile application downloads reached 1 million users with excellent performance metrics',
                'category': 'product',
                'tags': ['mobile', 'app', 'performance', 'users'],
                'embedding': self.generate_mock_embedding('mobile app performance users downloads')
            },
            {
                '_id': 'doc3',
                'title': 'Database Optimization Results',
                'content': 'Database performance optimization reduced query time by 40% improving system efficiency',
                'category': 'technical',
                'tags': ['database', 'optimization', 'performance', 'efficiency'],
                'embedding': self.generate_mock_embedding('database optimization performance efficiency')
            },
            {
                '_id': 'doc4',
                'title': 'AI Project Success',
                'content': 'Artificial intelligence initiative exceeded expectations with machine learning models',
                'category': 'technical',
                'tags': ['AI', 'artificial intelligence', 'machine learning', 'success'],
                'embedding': self.generate_mock_embedding('artificial intelligence machine learning success')
            },
            {
                '_id': 'doc5',
                'title': 'Customer Satisfaction Survey',
                'content': 'Customer satisfaction scores improved significantly after implementing new support system',
                'category': 'customer',
                'tags': ['customer', 'satisfaction', 'support', 'improvement'],
                'embedding': self.generate_mock_embedding('customer satisfaction support improvement')
            }
        ]

        await self.collection.insert_many(test_documents)
        print(f'✅ Inserted {len(test_documents)} test documents')

    async def create_search_indexes(self):
        print('\n🔧 Creating search indexes...')
        
        try:
            # Create vector search index
            await self.collection.create_search_index(
                'vector_index',
                'vectorSearch',
                {
                    'fields': [
                        {
                            'type': 'vector',
                            'path': 'embedding',
                            'numDimensions': 384,
                            'similarity': 'cosine'
                        }
                    ]
                }
            )
            print('✅ Created vector search index')

            # Create text search index
            await self.collection.create_search_index(
                'text_index',
                'search',
                {
                    'mappings': {
                        'dynamic': True
                    }
                }
            )
            print('✅ Created text search index')
            
            # Wait for indexes to be ready
            print('⏳ Waiting for indexes to be ready...')
            await asyncio.sleep(10)
            
        except Exception as error:
            print(f'⚠️  Index creation: {error}')
            # Indexes might already exist, continue with tests

    async def test_rank_fusion_hybrid_search(self):
        print('\n🧪 Testing $rankFusion Hybrid Search...')

        test_cases = [
            {
                'name': 'AI and Machine Learning Query',
                'query': 'machine learning artificial intelligence',
                'vector_query': self.generate_mock_embedding('machine learning artificial intelligence'),
                'expected_docs': ['doc1', 'doc4']
            },
            {
                'name': 'Performance Optimization Query',
                'query': 'performance optimization',
                'vector_query': self.generate_mock_embedding('performance optimization'),
                'expected_docs': ['doc2', 'doc3']
            },
            {
                'name': 'Customer Experience Query',
                'query': 'customer satisfaction',
                'vector_query': self.generate_mock_embedding('customer satisfaction'),
                'expected_docs': ['doc5']
            }
        ]

        for test_case in test_cases:
            try:
                print(f'\n📊 {test_case["name"]}:')
                print(f'   Query: "{test_case["query"]}"')

                # Test $rankFusion hybrid search
                hybrid_pipeline = [
                    {
                        '$rankFusion': {
                            'input': {
                                'pipelines': {
                                    'vectorPipeline': [
                                        {
                                            '$vectorSearch': {
                                                'index': 'vector_index',
                                                'path': 'embedding',
                                                'queryVector': test_case['vector_query'],
                                                'numCandidates': 50,
                                                'limit': 10
                                            }
                                        }
                                    ],
                                    'textPipeline': [
                                        {
                                            '$search': {
                                                'index': 'text_index',
                                                'text': {
                                                    'query': test_case['query'],
                                                    'path': ['title', 'content']
                                                }
                                            }
                                        },
                                        {'$limit': 10}
                                    ]
                                }
                            },
                            'combination': {
                                'weights': {
                                    'vectorPipeline': 0.7,
                                    'textPipeline': 0.3
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
                            'scoreDetails': {'$meta': 'scoreDetails'}
                        }
                    },
                    {'$limit': 5}
                ]

                hybrid_results = await self.collection.aggregate(hybrid_pipeline).to_list(length=None)
                
                print(f'   Hybrid Results: {len(hybrid_results)} found')
                for index, result in enumerate(hybrid_results):
                    score = result.get('scoreDetails', {}).get('value', 0)
                    print(f'     {index + 1}. {result["_id"]}: "{result["title"]}" (Score: {score:.3f})')
                    if 'details' in result.get('scoreDetails', {}):
                        vector_score = result['scoreDetails']['details'].get('vectorPipeline', {}).get('value', 0)
                        text_score = result['scoreDetails']['details'].get('textPipeline', {}).get('value', 0)
                        print(f'        Vector: {vector_score:.3f}, Text: {text_score:.3f}')

                # Test vector search only
                vector_results = await self.collection.aggregate([
                    {
                        '$vectorSearch': {
                            'index': 'vector_index',
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

                print(f'   Vector Only: {len(vector_results)} found')

                # Test text search only
                text_results = await self.collection.aggregate([
                    {
                        '$search': {
                            'index': 'text_index',
                            'text': {
                                'query': test_case['query'],
                                'path': ['title', 'content']
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

                print(f'   Text Only: {len(text_results)} found')

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
                        'vector_count': len(vector_results),
                        'text_count': len(text_results),
                        'found_expected': found_expected
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

    def generate_mock_embedding(self, text: str) -> List[float]:
        """Generate a simple mock embedding based on text."""
        words = text.lower().split(' ')
        embedding = [0.0] * 384
        
        for word in words:
            hash_val = self.simple_hash(word)
            for i in range(384):
                embedding[i] += math.sin(hash_val + i) * 0.1
        
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
            hash_val = hash_val & 0xFFFFFFFF  # Convert to 32-bit integer
        return hash_val

    async def run_all_tests(self):
        try:
            is_supported = await self.setup()
            
            if not is_supported:
                print('\n⚠️  $rankFusion is not supported on this MongoDB version')
                print('   Requires MongoDB 8.1+ for $rankFusion functionality')
                return

            await self.seed_test_data()
            await self.create_search_indexes()
            await self.test_rank_fusion_hybrid_search()
            
            self.print_summary()
        except Exception as error:
            print(f'❌ Test suite failed: {error}')
        finally:
            if self.client:
                self.client.close()

    def print_summary(self):
        print('\n' + '=' * 60)
        print('📊 REAL MONGODB ATLAS HYBRID SEARCH TEST SUMMARY (PYTHON)')
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
            print('\n🎉 MONGODB ATLAS $RANKFUSION HYBRID SEARCH IS WORKING!')
            print('🚀 Real hybrid search with reciprocal rank fusion confirmed!')
        else:
            print('\n⚠️  HYBRID SEARCH IMPLEMENTATION NEEDS ATTENTION!')


# Run the test
if __name__ == "__main__":
    test = RealHybridSearchTest()
    asyncio.run(test.run_all_tests())
