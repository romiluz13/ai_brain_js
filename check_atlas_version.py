"""
MongoDB Atlas Version and Feature Checker

This script checks your Atlas cluster version, available features,
and upgrade options for $rankFusion support.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any


class AtlasVersionChecker:
    def __init__(self):
        # Your Atlas connection
        self.mongo_uri = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain.tnv45wr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain'
        self.client = None

    async def check_cluster_info(self):
        print('🔍 Checking MongoDB Atlas Cluster Information...\n')
        
        try:
            self.client = AsyncIOMotorClient(self.mongo_uri)
            
            # Test connection
            await self.client.admin.command('ping')
            print('✅ Successfully connected to MongoDB Atlas')
            
            # Get build info
            build_info = await self.client.admin.command('buildInfo')
            
            print(f'📊 CLUSTER INFORMATION:')
            print(f'   MongoDB Version: {build_info["version"]}')
            print(f'   Git Version: {build_info.get("gitVersion", "N/A")}')
            print(f'   Build Environment: {build_info.get("buildEnvironment", {}).get("target_arch", "N/A")}')
            print(f'   Max BSON Size: {build_info.get("maxBsonObjectSize", "N/A")} bytes')
            
            # Check server status
            server_status = await self.client.admin.command('serverStatus')
            print(f'   Host: {server_status.get("host", "N/A")}')
            print(f'   Process: {server_status.get("process", "N/A")}')
            print(f'   Uptime: {server_status.get("uptime", "N/A")} seconds')
            
            # Check if it's Atlas
            is_atlas = 'atlas' in server_status.get('host', '').lower()
            print(f'   Atlas Cluster: {"✅ Yes" if is_atlas else "❌ No"}')
            
            return build_info
            
        except Exception as error:
            print(f'❌ Error checking cluster: {error}')
            return None

    async def check_feature_support(self, build_info: Dict[str, Any]):
        print(f'\n🔧 FEATURE SUPPORT ANALYSIS:')
        
        version = build_info['version']
        version_parts = [int(x) for x in version.split('.')]
        major, minor = version_parts[0], version_parts[1]
        
        print(f'   Current Version: {version}')
        
        # Check $rankFusion support
        rank_fusion_supported = major > 8 or (major == 8 and minor >= 1)
        print(f'   $rankFusion Support: {"✅ Supported" if rank_fusion_supported else "❌ Not Supported (Requires 8.1+)"}')
        
        # Check $vectorSearch support
        vector_search_supported = major >= 7
        print(f'   $vectorSearch Support: {"✅ Supported" if vector_search_supported else "❌ Not Supported"}')
        
        # Check $search support
        search_supported = major >= 4
        print(f'   $search (Atlas Search): {"✅ Supported" if search_supported else "❌ Not Supported"}')
        
        # Check Change Streams support
        change_streams_supported = major >= 3 and minor >= 6
        print(f'   Change Streams: {"✅ Supported" if change_streams_supported else "❌ Not Supported"}')
        
        # Check $graphLookup support
        graph_lookup_supported = major >= 3 and minor >= 4
        print(f'   $graphLookup: {"✅ Supported" if graph_lookup_supported else "❌ Not Supported"}')
        
        return {
            'version': version,
            'rankFusion': rank_fusion_supported,
            'vectorSearch': vector_search_supported,
            'search': search_supported,
            'changeStreams': change_streams_supported,
            'graphLookup': graph_lookup_supported
        }

    async def test_actual_features(self):
        print(f'\n🧪 TESTING ACTUAL FEATURE AVAILABILITY:')
        
        try:
            # Test database
            test_db = self.client.test_features
            test_collection = test_db.feature_test
            
            # Clear test data
            await test_collection.delete_many({})
            
            # Insert test document
            test_doc = {
                '_id': 'test1',
                'content': 'This is a test document for feature testing',
                'embedding': [0.1, 0.2, 0.3, 0.4, 0.5] * 100,  # 500 dimensions
                'metadata': {'category': 'test'}
            }
            await test_collection.insert_one(test_doc)
            
            # Test $vectorSearch
            try:
                vector_pipeline = [
                    {
                        '$vectorSearch': {
                            'index': 'test_vector_index',
                            'path': 'embedding',
                            'queryVector': [0.1, 0.2, 0.3, 0.4, 0.5] * 100,
                            'numCandidates': 10,
                            'limit': 5
                        }
                    }
                ]
                await test_collection.aggregate(vector_pipeline).to_list(length=None)
                print('   $vectorSearch: ✅ Working (but may need proper index)')
            except Exception as e:
                print(f'   $vectorSearch: ❌ Error - {str(e)[:100]}...')
            
            # Test $search
            try:
                search_pipeline = [
                    {
                        '$search': {
                            'index': 'test_text_index',
                            'text': {
                                'query': 'test document',
                                'path': 'content'
                            }
                        }
                    }
                ]
                await test_collection.aggregate(search_pipeline).to_list(length=None)
                print('   $search: ✅ Working (but may need proper index)')
            except Exception as e:
                print(f'   $search: ❌ Error - {str(e)[:100]}...')
            
            # Test $rankFusion
            try:
                rank_fusion_pipeline = [
                    {
                        '$rankFusion': {
                            'input': {
                                'pipelines': {
                                    'pipeline1': [{'$match': {'_id': 'test1'}}],
                                    'pipeline2': [{'$match': {'metadata.category': 'test'}}]
                                }
                            }
                        }
                    }
                ]
                await test_collection.aggregate(rank_fusion_pipeline).to_list(length=None)
                print('   $rankFusion: ✅ Working!')
            except Exception as e:
                error_msg = str(e)
                if 'Unrecognized pipeline stage name' in error_msg:
                    print('   $rankFusion: ❌ Not Available (MongoDB 8.1+ required)')
                else:
                    print(f'   $rankFusion: ❌ Error - {error_msg[:100]}...')
            
            # Test $graphLookup
            try:
                graph_pipeline = [
                    {
                        '$graphLookup': {
                            'from': 'feature_test',
                            'startWith': '$_id',
                            'connectFromField': '_id',
                            'connectToField': 'parent_id',
                            'as': 'connections'
                        }
                    }
                ]
                await test_collection.aggregate(graph_pipeline).to_list(length=None)
                print('   $graphLookup: ✅ Working!')
            except Exception as e:
                print(f'   $graphLookup: ❌ Error - {str(e)[:100]}...')
            
            # Cleanup
            await test_collection.delete_many({})
            
        except Exception as error:
            print(f'❌ Error testing features: {error}')

    async def check_upgrade_options(self, current_version: str):
        print(f'\n🚀 UPGRADE RECOMMENDATIONS:')
        
        version_parts = [int(x) for x in current_version.split('.')]
        major, minor = version_parts[0], version_parts[1]
        
        if major < 8:
            print('   ⚠️  CRITICAL: Your cluster is very outdated!')
            print('   📈 Recommended: Upgrade to MongoDB 8.1+ for full feature support')
            print('   🎯 Benefits: $rankFusion, latest $vectorSearch, performance improvements')
        elif major == 8 and minor == 0:
            print('   📈 RECOMMENDED: Upgrade to MongoDB 8.1+ for $rankFusion support')
            print('   🎯 Benefits: Native hybrid search with $rankFusion')
            print('   ⏰ Current: Application-level hybrid search required')
        elif major == 8 and minor >= 1:
            print('   ✅ EXCELLENT: Your cluster supports all latest features!')
            print('   🎉 You have access to $rankFusion for native hybrid search')
        else:
            print('   🚀 CUTTING EDGE: You have the latest MongoDB features!')
        
        print(f'\n💡 HOW TO UPGRADE YOUR ATLAS CLUSTER:')
        print('   1. Log into MongoDB Atlas (cloud.mongodb.com)')
        print('   2. Go to your cluster dashboard')
        print('   3. Click "Modify" or "Edit Configuration"')
        print('   4. Under "Cluster Tier", look for MongoDB version options')
        print('   5. Select MongoDB 8.1+ if available')
        print('   6. Apply changes (may cause brief downtime)')
        
        print(f'\n⚠️  IMPORTANT NOTES:')
        print('   • Atlas may not offer 8.1+ on all tiers yet')
        print('   • Check if your current tier supports version upgrades')
        print('   • Consider upgrading cluster tier if needed')
        print('   • Backup your data before major version upgrades')

    async def run_complete_check(self):
        print('🔍 MONGODB ATLAS COMPREHENSIVE CHECK')
        print('=' * 50)
        
        try:
            # Check cluster info
            build_info = await self.check_cluster_info()
            if not build_info:
                return
            
            # Check feature support
            features = await self.check_feature_support(build_info)
            
            # Test actual features
            await self.test_actual_features()
            
            # Check upgrade options
            await self.check_upgrade_options(features['version'])
            
            print(f'\n📋 SUMMARY:')
            print(f'   Your cluster is running MongoDB {features["version"]}')
            if features['rankFusion']:
                print('   🎉 You have $rankFusion support - hybrid search should work!')
            else:
                print('   ⚠️  No $rankFusion - use application-level hybrid search')
            
        except Exception as error:
            print(f'❌ Check failed: {error}')
        finally:
            if self.client:
                self.client.close()


# Run the comprehensive check
if __name__ == "__main__":
    checker = AtlasVersionChecker()
    asyncio.run(checker.run_complete_check())
