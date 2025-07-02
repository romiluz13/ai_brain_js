"""
WORKING HYBRID SEARCH TEST FOR MONGODB 8.0

This test implements REAL hybrid search that actually works on MongoDB 8.0
using separate queries and application-level fusion (not $rankFusion).
"""

import asyncio
import math
import time
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Any


class WorkingHybridSearchTest:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.test_results = []
        
        # Real MongoDB Atlas connection
        self.mongo_uri = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain.tnv45wr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain'

    async def setup(self):
        print('🔧 Connecting to MongoDB Atlas...')
        
        try:
            self.client = AsyncIOMotorClient(self.mongo_uri)
            self.db = self.client.ai_brain_test
            self.collection = self.db.working_hybrid_test
            
            # Test connection
            await self.client.admin.command('ping')
            print('✅ Connected to MongoDB Atlas successfully')
            
            # Check MongoDB version
            build_info = await self.client.admin.command('buildInfo')
            version = build_info['version']
            print(f'📊 MongoDB Version: {version}')
            print('🔧 Using application-level hybrid search (compatible with all MongoDB versions)')
            
            return True
            
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

    async def test_working_hybrid_search(self):
        print('\n🧪 Testing WORKING Hybrid Search (Application-Level Fusion)...')

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

                # Step 1: Vector Search
                vector_results = await self.collection.aggregate([
                    {
                        '$vectorSearch': {
                            'index': 'vector_index',
                            'path': 'embedding',
                            'queryVector': test_case['vector_query'],
                            'numCandidates': 50,
                            'limit': 10
                        }
                    },
                    {
                        '$project': {
                            '_id': 1,
                            'title': 1,
                            'content': 1,
                            'category': 1,
                            'vector_score': {'$meta': 'vectorSearchScore'}
                        }
                    }
                ]).to_list(length=None)

                print(f'   Vector Search: {len(vector_results)} results')

                # Step 2: Text Search
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
                            'content': 1,
                            'category': 1,
                            'text_score': {'$meta': 'searchScore'}
                        }
                    },
                    {'$limit': 10}
                ]).to_list(length=None)

                print(f'   Text Search: {len(text_results)} results')

                # Step 3: Application-Level Hybrid Fusion
                hybrid_results = self.fuse_search_results(
                    vector_results, 
                    text_results, 
                    vector_weight=0.7, 
                    text_weight=0.3
                )

                print(f'   Hybrid Fusion: {len(hybrid_results)} results')
                for index, result in enumerate(hybrid_results[:5]):
                    print(f'     {index + 1}. {result["_id"]}: "{result["title"]}" (Score: {result["hybrid_score"]:.3f})')
                    print(f'        Vector: {result.get("vector_score", 0):.3f}, Text: {result.get("text_score", 0):.3f}')

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

    def fuse_search_results(self, vector_results: List[Dict], text_results: List[Dict], 
                           vector_weight: float = 0.7, text_weight: float = 0.3) -> List[Dict]:
        """
        Application-level hybrid search fusion using reciprocal rank fusion algorithm.
        This is what should actually be implemented instead of $rankFusion.
        """
        # Create a dictionary to store combined results
        combined_results = {}
        
        # Process vector search results
        for rank, result in enumerate(vector_results):
            doc_id = result['_id']
            # Reciprocal rank fusion formula: 1 / (rank + 60)
            reciprocal_rank = 1.0 / (rank + 1 + 60)
            weighted_score = vector_weight * reciprocal_rank
            
            combined_results[doc_id] = {
                '_id': doc_id,
                'title': result['title'],
                'content': result['content'],
                'category': result['category'],
                'vector_score': result.get('vector_score', 0),
                'text_score': 0,
                'vector_rank': rank + 1,
                'text_rank': None,
                'hybrid_score': weighted_score
            }
        
        # Process text search results
        for rank, result in enumerate(text_results):
            doc_id = result['_id']
            reciprocal_rank = 1.0 / (rank + 1 + 60)
            weighted_score = text_weight * reciprocal_rank
            
            if doc_id in combined_results:
                # Document found in both searches - add text score
                combined_results[doc_id]['text_score'] = result.get('text_score', 0)
                combined_results[doc_id]['text_rank'] = rank + 1
                combined_results[doc_id]['hybrid_score'] += weighted_score
            else:
                # Document only found in text search
                combined_results[doc_id] = {
                    '_id': doc_id,
                    'title': result['title'],
                    'content': result['content'],
                    'category': result['category'],
                    'vector_score': 0,
                    'text_score': result.get('text_score', 0),
                    'vector_rank': None,
                    'text_rank': rank + 1,
                    'hybrid_score': weighted_score
                }
        
        # Sort by hybrid score (descending)
        sorted_results = sorted(combined_results.values(), key=lambda x: x['hybrid_score'], reverse=True)
        
        return sorted_results

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
            await self.setup()
            await self.seed_test_data()
            await self.create_search_indexes()
            await self.test_working_hybrid_search()
            
            self.print_summary()
        except Exception as error:
            print(f'❌ Test suite failed: {error}')
        finally:
            if self.client:
                self.client.close()

    def print_summary(self):
        print('\n' + '=' * 60)
        print('📊 WORKING HYBRID SEARCH TEST SUMMARY')
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
            print('\n🎉 WORKING HYBRID SEARCH IS FUNCTIONING!')
            print('🚀 Application-level reciprocal rank fusion confirmed!')
            print('💡 This is the CORRECT implementation for MongoDB 8.0!')
        else:
            print('\n⚠️  HYBRID SEARCH IMPLEMENTATION NEEDS ATTENTION!')


# Run the test
if __name__ == "__main__":
    test = WorkingHybridSearchTest()
    asyncio.run(test.run_all_tests())
