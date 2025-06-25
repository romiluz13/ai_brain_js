/**
 * @file TemporalPlanningEngine.test.ts - Comprehensive tests for TemporalPlanningEngine
 * 
 * Tests the TemporalPlanningEngine's ability to:
 * - Create and optimize temporal plans with time-series analysis
 * - Predict future states using predictive analytics
 * - Optimize plans using constraint satisfaction
 * - Analyze plan performance and generate insights
 * - Demonstrate MongoDB's time-series and predictive analytics capabilities
 */

import { MongoClient, Db } from 'mongodb';
import { TemporalPlanningEngine } from '../../intelligence/TemporalPlanningEngine';
import { TemporalPlanCollection } from '../../collections/TemporalPlanCollection';

describe('TemporalPlanningEngine - Real MongoDB Integration', () => {
  let client: MongoClient;
  let db: Db;
  let planningEngine: TemporalPlanningEngine;
  let planCollection: TemporalPlanCollection;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    
    // Use test database
    db = client.db('test_ai_brain_temporal_planning');
    planningEngine = new TemporalPlanningEngine(db);
    planCollection = new TemporalPlanCollection(db);
    
    // Initialize the engine
    await planningEngine.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    await planningEngine.cleanup();
    await db.dropDatabase();
    await client.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await db.collection('agent_temporal_plans').deleteMany({});
  });

  describe('Temporal Plan Creation and Optimization', () => {
    it('should create and optimize a temporal plan', async () => {
      const agentId = 'test-agent-planning-001';
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
      
      const planningRequest = {
        agentId,
        sessionId: 'session-planning-123',
        planName: 'Data Processing Project',
        planType: 'sequential' as const,
        category: 'task_execution' as const,
        priority: 'high' as const,
        
        timeframe: {
          startTime,
          endTime,
          flexibility: 0.2, // 20% flexibility
          timezone: 'UTC'
        },
        
        tasks: [
          {
            id: 'task-001',
            name: 'Data Collection',
            type: 'atomic' as const,
            estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
            requirements: {
              skills: ['data_extraction', 'api_integration'],
              resources: [{ resourceId: 'database_access', quantity: 1 }],
              conditions: { internet_required: true }
            },
            dependencies: []
          },
          {
            id: 'task-002',
            name: 'Data Processing',
            type: 'composite' as const,
            estimatedDuration: 4 * 60 * 60 * 1000, // 4 hours
            requirements: {
              skills: ['data_analysis', 'machine_learning'],
              resources: [{ resourceId: 'compute_cluster', quantity: 4 }],
              conditions: { high_memory_required: true }
            },
            dependencies: [
              { predecessorId: 'task-001', type: 'finish_to_start', lag: 0 }
            ]
          },
          {
            id: 'task-003',
            name: 'Report Generation',
            type: 'atomic' as const,
            estimatedDuration: 1 * 60 * 60 * 1000, // 1 hour
            requirements: {
              skills: ['report_writing', 'data_visualization'],
              resources: [{ resourceId: 'reporting_tools', quantity: 1 }],
              conditions: { template_available: true }
            },
            dependencies: [
              { predecessorId: 'task-002', type: 'finish_to_start', lag: 30 * 60 * 1000 } // 30 min lag
            ]
          }
        ],
        
        constraints: {
          deadlines: [
            { taskId: 'task-003', deadline: endTime, hardDeadline: true }
          ],
          resources: [
            { resourceId: 'compute_cluster', maxCapacity: 8, availability: [] },
            { resourceId: 'database_access', maxCapacity: 2, availability: [] }
          ],
          quality: { minimumLevel: 0.8, targetLevel: 0.95 }
        },
        
        objectives: [
          { name: 'duration', type: 'minimize' as const, weight: 0.4 },
          { name: 'quality', type: 'maximize' as const, weight: 0.4, target: 0.95 },
          { name: 'efficiency', type: 'maximize' as const, weight: 0.2, target: 0.85 }
        ]
      };

      // Create the plan
      const planResult = await planningEngine.createPlan(planningRequest);
      
      expect(planResult.planId).toBeDefined();
      expect(planResult.optimizedSchedule).toBeDefined();
      expect(planResult.criticalPath).toBeInstanceOf(Array);
      expect(planResult.riskAssessment).toBeDefined();
      expect(planResult.performancePredictions).toBeDefined();

      // Verify the plan was recorded in MongoDB
      const recordedPlans = await planCollection.getAgentPlans(agentId);
      expect(recordedPlans).toHaveLength(1);
      
      const plan = recordedPlans[0];
      expect(plan.agentId).toBe(agentId);
      expect(plan.plan.name).toBe('Data Processing Project');
      expect(plan.plan.type).toBe('sequential');
      expect(plan.structure.tasks).toHaveLength(3);
      expect(plan.temporal.timeframe.startTime).toEqual(startTime);
      expect(plan.temporal.timeframe.endTime).toEqual(endTime);

      // Verify optimization objectives
      expect(plan.prediction.optimization.objectives).toHaveLength(3);
      const durationObjective = plan.prediction.optimization.objectives.find(obj => obj.name === 'duration');
      expect(durationObjective).toBeDefined();
      expect(durationObjective!.type).toBe('minimize');
      expect(durationObjective!.weight).toBe(0.4);
    });

    it('should handle complex parallel task planning', async () => {
      const agentId = 'test-agent-parallel';
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours later
      
      const parallelPlanRequest = {
        agentId,
        planName: 'Parallel Processing Pipeline',
        planType: 'parallel' as const,
        category: 'optimization' as const,
        priority: 'critical' as const,
        
        timeframe: {
          startTime,
          endTime,
          flexibility: 0.1, // 10% flexibility
          timezone: 'UTC'
        },
        
        tasks: [
          {
            id: 'parallel-001',
            name: 'Data Stream A Processing',
            type: 'atomic' as const,
            estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
            requirements: {
              skills: ['stream_processing'],
              resources: [{ resourceId: 'stream_processor_a', quantity: 1 }],
              conditions: {}
            },
            dependencies: []
          },
          {
            id: 'parallel-002',
            name: 'Data Stream B Processing',
            type: 'atomic' as const,
            estimatedDuration: 2.5 * 60 * 60 * 1000, // 2.5 hours
            requirements: {
              skills: ['stream_processing'],
              resources: [{ resourceId: 'stream_processor_b', quantity: 1 }],
              conditions: {}
            },
            dependencies: []
          },
          {
            id: 'merge-001',
            name: 'Stream Merge and Analysis',
            type: 'composite' as const,
            estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
            requirements: {
              skills: ['data_merging', 'analysis'],
              resources: [{ resourceId: 'analysis_engine', quantity: 1 }],
              conditions: {}
            },
            dependencies: [
              { predecessorId: 'parallel-001', type: 'finish_to_start', lag: 0 },
              { predecessorId: 'parallel-002', type: 'finish_to_start', lag: 0 }
            ]
          }
        ],
        
        constraints: {
          deadlines: [
            { taskId: 'merge-001', deadline: endTime, hardDeadline: false }
          ],
          resources: [
            { resourceId: 'stream_processor_a', maxCapacity: 1, availability: [] },
            { resourceId: 'stream_processor_b', maxCapacity: 1, availability: [] },
            { resourceId: 'analysis_engine', maxCapacity: 1, availability: [] }
          ],
          quality: { minimumLevel: 0.85, targetLevel: 0.95 }
        },
        
        objectives: [
          { name: 'duration', type: 'minimize' as const, weight: 0.6 },
          { name: 'efficiency', type: 'maximize' as const, weight: 0.4 }
        ]
      };

      const planResult = await planningEngine.createPlan(parallelPlanRequest);
      
      expect(planResult.planId).toBeDefined();
      expect(planResult.optimizedSchedule.tasks).toHaveLength(3);
      expect(planResult.criticalPath).toContain('parallel-001'); // Longest duration task
      
      // Verify parallel execution optimization
      const plan = (await planCollection.getAgentPlans(agentId))[0];
      expect(plan.plan.type).toBe('parallel');
      expect(plan.structure.tasks.filter(t => t.dependencies.length === 0)).toHaveLength(2); // Two parallel tasks
    });
  });

  describe('Future State Prediction with Time-Series Analysis', () => {
    it('should predict future states using time-series analysis', async () => {
      const agentId = 'test-agent-prediction';
      
      // Create a plan first
      const planResult = await planningEngine.createPlan({
        agentId,
        planName: 'Prediction Test Plan',
        planType: 'sequential',
        category: 'learning',
        priority: 'medium',
        timeframe: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          flexibility: 0.3,
          timezone: 'UTC'
        },
        tasks: [
          {
            id: 'pred-task-001',
            name: 'Learning Phase',
            type: 'atomic',
            estimatedDuration: 2 * 60 * 60 * 1000,
            requirements: { skills: ['learning'], resources: [], conditions: {} },
            dependencies: []
          }
        ],
        constraints: {
          deadlines: [],
          resources: [],
          quality: { minimumLevel: 0.7, targetLevel: 0.9 }
        },
        objectives: [
          { name: 'quality', type: 'maximize', weight: 1.0 }
        ]
      });

      // Predict future states
      const predictionRequest = {
        agentId,
        timeHorizon: 8, // 8 hours into the future
        scenarios: [
          {
            name: 'optimal_conditions',
            probability: 0.3,
            conditions: { resource_availability: 'high', external_interference: 'low' }
          },
          {
            name: 'normal_conditions',
            probability: 0.6,
            conditions: { resource_availability: 'medium', external_interference: 'medium' }
          },
          {
            name: 'challenging_conditions',
            probability: 0.1,
            conditions: { resource_availability: 'low', external_interference: 'high' }
          }
        ],
        factors: ['resource_availability', 'task_complexity', 'agent_performance', 'external_dependencies']
      };

      const predictions = await planningEngine.predictFutureStates(predictionRequest);
      
      expect(predictions).toBeInstanceOf(Array);
      predictions.forEach(prediction => {
        expect(prediction.timestamp).toBeInstanceOf(Date);
        expect(prediction.state).toBeDefined();
        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(1);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.influencingFactors).toBeInstanceOf(Array);
        expect(prediction.influencingFactors).toEqual(
          expect.arrayContaining(predictionRequest.factors)
        );
      });

      // Verify predictions include scenario enhancements
      const enhancedPredictions = predictions.filter(p => 
        Object.keys(p.state).some(key => key.startsWith('scenario_'))
      );
      expect(enhancedPredictions.length).toBeGreaterThan(0);
    });
  });

  describe('Plan Optimization with Constraint Satisfaction', () => {
    it('should optimize existing plans using constraint satisfaction', async () => {
      const agentId = 'test-agent-optimization';
      
      // Create a plan to optimize
      const planResult = await planningEngine.createPlan({
        agentId,
        planName: 'Optimization Test Plan',
        planType: 'sequential',
        category: 'task_execution',
        priority: 'high',
        timeframe: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          flexibility: 0.2,
          timezone: 'UTC'
        },
        tasks: [
          {
            id: 'opt-task-001',
            name: 'Initial Task',
            type: 'atomic',
            estimatedDuration: 3 * 60 * 60 * 1000,
            requirements: { skills: ['processing'], resources: [], conditions: {} },
            dependencies: []
          },
          {
            id: 'opt-task-002',
            name: 'Follow-up Task',
            type: 'atomic',
            estimatedDuration: 2 * 60 * 60 * 1000,
            requirements: { skills: ['analysis'], resources: [], conditions: {} },
            dependencies: [{ predecessorId: 'opt-task-001', type: 'finish_to_start', lag: 0 }]
          }
        ],
        constraints: {
          deadlines: [],
          resources: [],
          quality: { minimumLevel: 0.8, targetLevel: 0.9 }
        },
        objectives: [
          { name: 'duration', type: 'minimize', weight: 0.5 },
          { name: 'efficiency', type: 'maximize', weight: 0.5 }
        ]
      });

      // Optimize the plan
      const optimizationRequest = {
        planId: planResult.planId,
        objectives: [
          {
            name: 'duration',
            type: 'minimize' as const,
            weight: 0.6,
            currentValue: 5 * 60 * 60 * 1000, // 5 hours
            targetValue: 4 * 60 * 60 * 1000 // 4 hours
          },
          {
            name: 'efficiency',
            type: 'maximize' as const,
            weight: 0.4,
            currentValue: 0.75,
            targetValue: 0.9
          }
        ],
        constraints: [
          {
            name: 'max_duration',
            type: 'hard' as const,
            expression: 'duration <= 4.5 * 60 * 60 * 1000',
            penalty: 1000
          },
          {
            name: 'min_efficiency',
            type: 'soft' as const,
            expression: 'efficiency >= 0.8',
            penalty: 100
          }
        ],
        optimizationMethod: 'heuristic' as const
      };

      const optimizationResult = await planningEngine.optimizePlan(optimizationRequest);
      
      expect(optimizationResult.optimizationId).toBeDefined();
      expect(optimizationResult.improvedObjectives).toBeDefined();
      expect(optimizationResult.constraintSatisfaction).toBeDefined();
      expect(optimizationResult.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(optimizationResult.optimizationScore).toBeLessThanOrEqual(1);
      expect(optimizationResult.recommendedChanges).toBeInstanceOf(Array);

      // Verify constraint satisfaction
      Object.values(optimizationResult.constraintSatisfaction).forEach(satisfied => {
        expect(typeof satisfied).toBe('boolean');
      });

      // Verify improvements
      Object.values(optimizationResult.improvedObjectives).forEach(improvement => {
        expect(typeof improvement).toBe('number');
      });
    });
  });

  describe('Plan Analysis and Performance Insights', () => {
    it('should analyze plan performance and generate comprehensive insights', async () => {
      const agentId = 'test-agent-analysis';
      
      // Create a plan for analysis
      const planResult = await planningEngine.createPlan({
        agentId,
        planName: 'Analysis Test Plan',
        planType: 'conditional',
        category: 'goal_achievement',
        priority: 'medium',
        timeframe: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
          flexibility: 0.25,
          timezone: 'UTC'
        },
        tasks: [
          {
            id: 'analysis-task-001',
            name: 'Data Preparation',
            type: 'atomic',
            estimatedDuration: 1.5 * 60 * 60 * 1000,
            requirements: { skills: ['data_prep'], resources: [], conditions: {} },
            dependencies: []
          },
          {
            id: 'analysis-task-002',
            name: 'Analysis Execution',
            type: 'composite',
            estimatedDuration: 2.5 * 60 * 60 * 1000,
            requirements: { skills: ['analysis'], resources: [], conditions: {} },
            dependencies: [{ predecessorId: 'analysis-task-001', type: 'finish_to_start', lag: 0 }]
          }
        ],
        constraints: {
          deadlines: [],
          resources: [],
          quality: { minimumLevel: 0.85, targetLevel: 0.95 }
        },
        objectives: [
          { name: 'quality', type: 'maximize', weight: 0.7 },
          { name: 'efficiency', type: 'maximize', weight: 0.3 }
        ]
      });

      // Analyze the plan
      const analytics = await planningEngine.analyzePlan(planResult.planId);
      
      expect(analytics.performance).toEqual(
        expect.objectContaining({
          efficiency: expect.any(Number),
          effectiveness: expect.any(Number),
          timeliness: expect.any(Number),
          quality: expect.any(Number)
        })
      );

      expect(analytics.predictions).toEqual(
        expect.objectContaining({
          completionProbability: expect.any(Number),
          estimatedCompletionTime: expect.any(Date),
          riskFactors: expect.any(Array),
          successScenarios: expect.any(Array)
        })
      );

      expect(analytics.optimization).toEqual(
        expect.objectContaining({
          currentScore: expect.any(Number),
          potentialImprovement: expect.any(Number),
          recommendedChanges: expect.any(Array),
          tradeoffs: expect.any(Array)
        })
      );

      expect(analytics.insights).toEqual(
        expect.objectContaining({
          criticalPath: expect.any(Array),
          bottlenecks: expect.any(Array),
          resourceUtilization: expect.any(Object),
          learningOpportunities: expect.any(Array)
        })
      );

      // Verify risk factors have proper structure
      analytics.predictions.riskFactors.forEach(risk => {
        expect(risk).toEqual(
          expect.objectContaining({
            factor: expect.any(String),
            impact: expect.any(Number),
            probability: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Plan Progress Tracking and Adaptation', () => {
    it('should update plan progress and recommend adaptations', async () => {
      const agentId = 'test-agent-progress';
      
      // Create a plan
      const planResult = await planningEngine.createPlan({
        agentId,
        planName: 'Progress Tracking Plan',
        planType: 'sequential',
        category: 'task_execution',
        priority: 'high',
        timeframe: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          flexibility: 0.15,
          timezone: 'UTC'
        },
        tasks: [
          {
            id: 'progress-task-001',
            name: 'Phase 1',
            type: 'atomic',
            estimatedDuration: 2 * 60 * 60 * 1000,
            requirements: { skills: ['phase1'], resources: [], conditions: {} },
            dependencies: []
          },
          {
            id: 'progress-task-002',
            name: 'Phase 2',
            type: 'atomic',
            estimatedDuration: 2 * 60 * 60 * 1000,
            requirements: { skills: ['phase2'], resources: [], conditions: {} },
            dependencies: [{ predecessorId: 'progress-task-001', type: 'finish_to_start', lag: 0 }]
          }
        ],
        constraints: {
          deadlines: [],
          resources: [],
          quality: { minimumLevel: 0.8, targetLevel: 0.9 }
        },
        objectives: [
          { name: 'duration', type: 'minimize', weight: 1.0 }
        ]
      });

      // Update progress (simulating being behind schedule)
      const progressUpdate = {
        overall: 0.3, // 30% complete
        taskUpdates: [
          {
            taskId: 'progress-task-001',
            status: 'in_progress',
            progress: 0.6,
            actualDuration: 2.5 * 60 * 60 * 1000 // Taking longer than expected
          }
        ],
        milestoneUpdates: []
      };

      const updateResult = await planningEngine.updatePlanProgress(
        planResult.planId,
        progressUpdate
      );
      
      expect(updateResult.updated).toBe(true);
      expect(updateResult.adaptationsRequired).toBe(true); // Should detect being behind
      expect(updateResult.recommendedAdaptations).toBeInstanceOf(Array);
      expect(updateResult.recommendedAdaptations.length).toBeGreaterThan(0);
      expect(updateResult.newPredictions).toBeDefined();

      // Verify progress was updated in database
      const updatedPlans = await planCollection.getAgentPlans(agentId);
      const updatedPlan = updatedPlans.find(p => p.plan.id === planResult.planId);
      expect(updatedPlan).toBeDefined();
      expect(updatedPlan!.execution.progress.overall).toBe(0.3);
    });

    it('should track active plans for an agent', async () => {
      const agentId = 'test-agent-active-plans';
      
      // Create multiple plans
      const planTypes = ['sequential', 'parallel', 'adaptive'];
      const planIds = [];

      for (const planType of planTypes) {
        const result = await planningEngine.createPlan({
          agentId,
          planName: `${planType} Plan`,
          planType: planType as any,
          category: 'task_execution',
          priority: 'medium',
          timeframe: {
            startTime: new Date(),
            endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
            flexibility: 0.2,
            timezone: 'UTC'
          },
          tasks: [
            {
              id: `${planType}-task-001`,
              name: `${planType} Task`,
              type: 'atomic',
              estimatedDuration: 2 * 60 * 60 * 1000,
              requirements: { skills: [planType], resources: [], conditions: {} },
              dependencies: []
            }
          ],
          constraints: {
            deadlines: [],
            resources: [],
            quality: { minimumLevel: 0.8, targetLevel: 0.9 }
          },
          objectives: [
            { name: 'efficiency', type: 'maximize', weight: 1.0 }
          ]
        });
        planIds.push(result.planId);
      }

      // Get active plans
      const activePlans = await planningEngine.getActivePlans(agentId);
      
      expect(activePlans).toHaveLength(3);
      activePlans.forEach(plan => {
        expect(plan.planId).toBeDefined();
        expect(plan.name).toBeDefined();
        expect(plan.status).toBeDefined();
        expect(plan.progress).toBeGreaterThanOrEqual(0);
        expect(plan.estimatedCompletion).toBeInstanceOf(Date);
        expect(plan.criticalTasks).toBeInstanceOf(Array);
      });

      // Verify plan IDs match
      const returnedPlanIds = activePlans.map(p => p.planId);
      planIds.forEach(id => {
        expect(returnedPlanIds).toContain(id);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle uninitialized engine gracefully', async () => {
      const uninitializedEngine = new TemporalPlanningEngine(db);

      await expect(uninitializedEngine.createPlan({
        agentId: 'test',
        planName: 'Test Plan',
        planType: 'sequential',
        category: 'task_execution',
        priority: 'medium',
        timeframe: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          flexibility: 0.1,
          timezone: 'UTC'
        },
        tasks: [],
        constraints: {
          deadlines: [],
          resources: [],
          quality: { minimumLevel: 0.8, targetLevel: 0.9 }
        },
        objectives: []
      })).rejects.toThrow('TemporalPlanningEngine must be initialized first');
    });

    it('should handle invalid plan IDs gracefully', async () => {
      await expect(planningEngine.analyzePlan('non-existent-plan')).rejects.toThrow('Plan not found');
    });
  });
});
