/**
 * @file SkillCapabilityManager.test.ts - Comprehensive tests for SkillCapabilityManager
 * 
 * Tests the SkillCapabilityManager's ability to:
 * - Assess and track skill proficiency with complex indexing
 * - Generate skill development plans with learning analytics
 * - Match capabilities to requirements with gap analysis
 * - Provide skill analytics and recommendations
 * - Demonstrate MongoDB's complex indexing and metadata management
 */

import { MongoClient, Db } from 'mongodb';
import { SkillCapabilityManager } from '../../intelligence/SkillCapabilityManager';
import { SkillCapabilityCollection } from '../../collections/SkillCapabilityCollection';

describe('SkillCapabilityManager - Real MongoDB Integration', () => {
  let client: MongoClient;
  let db: Db;
  let skillManager: SkillCapabilityManager;
  let skillCollection: SkillCapabilityCollection;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    
    // Use test database
    db = client.db('test_ai_brain_skill_capability');
    skillManager = new SkillCapabilityManager(db);
    skillCollection = new SkillCapabilityCollection(db);
    
    // Initialize the manager
    await skillManager.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    await db.dropDatabase();
    await client.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await db.collection('agent_capabilities').deleteMany({});
  });

  describe('Skill Assessment and Proficiency Tracking', () => {
    it('should assess and record skill performance with complex indexing', async () => {
      const agentId = 'test-agent-skill-001';
      
      const assessmentRequest = {
        agentId,
        sessionId: 'session-123',
        skillId: 'javascript_programming',
        skillName: 'JavaScript Programming',
        category: 'technical',
        subcategory: 'programming',
        domain: 'software_engineering',
        context: {
          taskType: 'web_development',
          complexity: 0.7,
          duration: 120, // 2 hours
          outcome: 'successful' as const,
          evidence: 'Completed React component with proper error handling',
          feedback: 'Good code structure and documentation'
        },
        performance: {
          accuracy: 0.85,
          efficiency: 0.78,
          quality: 0.92,
          creativity: 0.75,
          collaboration: 0.80
        },
        environment: {
          pressure: 'medium' as const,
          support: 'moderate' as const,
          resources: 'adequate' as const,
          timeConstraints: 'moderate' as const
        }
      };

      // Assess the skill
      const skillId = await skillManager.assessSkill(assessmentRequest);
      expect(skillId).toBeDefined();

      // Verify the skill was recorded in MongoDB
      const recordedSkill = await skillCollection.collection.findOne({ _id: skillId });
      expect(recordedSkill).toBeDefined();
      expect(recordedSkill!.agentId).toBe(agentId);
      expect(recordedSkill!.skill.name).toBe('JavaScript Programming');
      expect(recordedSkill!.skill.category).toBe('technical');
      expect(recordedSkill!.proficiency.current).toBeGreaterThan(0);
      expect(recordedSkill!.proficiency.confidence).toBeGreaterThan(0);

      // Verify complex indexing works
      const indexedSkills = await skillCollection.getAgentSkills(agentId, {
        'skill.category': 'technical'
      });
      expect(indexedSkills).toHaveLength(1);
      expect(indexedSkills[0].skill.name).toBe('JavaScript Programming');
    });

    it('should handle multiple skill assessments and track progression', async () => {
      const agentId = 'test-agent-progression';
      
      // First assessment - beginner level
      const beginnerAssessment = {
        agentId,
        skillId: 'data_analysis',
        skillName: 'Data Analysis',
        category: 'analytical',
        subcategory: 'statistics',
        domain: 'data_science',
        context: {
          taskType: 'basic_analysis',
          complexity: 0.3,
          duration: 60,
          outcome: 'partially_successful' as const,
          evidence: 'Basic statistical analysis with some errors'
        },
        performance: {
          accuracy: 0.65,
          efficiency: 0.70,
          quality: 0.60
        },
        environment: {
          pressure: 'low' as const,
          support: 'extensive' as const,
          resources: 'abundant' as const,
          timeConstraints: 'relaxed' as const
        }
      };

      const skillId1 = await skillManager.assessSkill(beginnerAssessment);

      // Second assessment - improved performance
      const improvedAssessment = {
        ...beginnerAssessment,
        context: {
          ...beginnerAssessment.context,
          complexity: 0.5,
          outcome: 'successful' as const,
          evidence: 'Comprehensive analysis with proper visualizations'
        },
        performance: {
          accuracy: 0.82,
          efficiency: 0.78,
          quality: 0.85
        }
      };

      const skillId2 = await skillManager.assessSkill(improvedAssessment);

      // Verify progression tracking
      const skills = await skillCollection.getAgentSkills(agentId);
      expect(skills).toHaveLength(2);
      
      // Check that proficiency improved
      const sortedSkills = skills.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      expect(sortedSkills[1].proficiency.current).toBeGreaterThan(sortedSkills[0].proficiency.current);
    });
  });

  describe('Skill Development Planning', () => {
    it('should generate comprehensive development plans', async () => {
      const agentId = 'test-agent-development';
      
      // Create some existing skills
      await skillManager.assessSkill({
        agentId,
        skillId: 'communication',
        skillName: 'Communication',
        category: 'soft_skills',
        subcategory: 'interpersonal',
        domain: 'general',
        context: {
          taskType: 'presentation',
          complexity: 0.6,
          duration: 45,
          outcome: 'successful' as const
        },
        performance: {
          accuracy: 0.75,
          efficiency: 0.70,
          quality: 0.80
        },
        environment: {
          pressure: 'medium' as const,
          support: 'moderate' as const,
          resources: 'adequate' as const,
          timeConstraints: 'moderate' as const
        }
      });

      // Generate development plan
      const developmentPlan = await skillManager.generateDevelopmentPlan(
        agentId, 
        ['Communication', 'Leadership', 'Project Management']
      );

      expect(developmentPlan.agentId).toBe(agentId);
      expect(developmentPlan.targetSkills).toHaveLength(3);
      expect(developmentPlan.timeline.startDate).toBeDefined();
      expect(developmentPlan.timeline.estimatedCompletionDate).toBeDefined();
      expect(developmentPlan.recommendations.focusAreas).toBeInstanceOf(Array);

      // Verify target skills have learning paths
      developmentPlan.targetSkills.forEach(skill => {
        expect(skill.skillName).toBeDefined();
        expect(skill.currentProficiency).toBeGreaterThanOrEqual(0);
        expect(skill.targetProficiency).toBeGreaterThan(skill.currentProficiency);
        expect(skill.learningPath).toBeInstanceOf(Array);
        expect(skill.estimatedTimeToTarget).toBeGreaterThan(0);
      });
    });
  });

  describe('Capability Matching and Gap Analysis', () => {
    it('should match agent capabilities to job requirements', async () => {
      const agentId = 'test-agent-matching';
      
      // Create agent skills
      await skillManager.assessSkill({
        agentId,
        skillId: 'python_programming',
        skillName: 'Python Programming',
        category: 'technical',
        subcategory: 'programming',
        domain: 'software_engineering',
        context: {
          taskType: 'backend_development',
          complexity: 0.8,
          duration: 180,
          outcome: 'successful' as const
        },
        performance: {
          accuracy: 0.90,
          efficiency: 0.85,
          quality: 0.88
        },
        environment: {
          pressure: 'high' as const,
          support: 'minimal' as const,
          resources: 'limited' as const,
          timeConstraints: 'tight' as const
        }
      });

      await skillManager.assessSkill({
        agentId,
        skillId: 'machine_learning',
        skillName: 'Machine Learning',
        category: 'technical',
        subcategory: 'ai_ml',
        domain: 'data_science',
        context: {
          taskType: 'model_training',
          complexity: 0.6,
          duration: 240,
          outcome: 'partially_successful' as const
        },
        performance: {
          accuracy: 0.65,
          efficiency: 0.60,
          quality: 0.70
        },
        environment: {
          pressure: 'medium' as const,
          support: 'moderate' as const,
          resources: 'adequate' as const,
          timeConstraints: 'moderate' as const
        }
      });

      // Define job requirements
      const matchingRequest = {
        agentId,
        requiredSkills: [
          {
            skillId: 'python_programming',
            skillName: 'Python Programming',
            minimumProficiency: 0.8,
            importance: 0.9,
            category: 'technical'
          },
          {
            skillId: 'machine_learning',
            skillName: 'Machine Learning',
            minimumProficiency: 0.75,
            importance: 0.8,
            category: 'technical'
          },
          {
            skillId: 'data_visualization',
            skillName: 'Data Visualization',
            minimumProficiency: 0.7,
            importance: 0.6,
            category: 'technical'
          }
        ],
        taskContext: {
          type: 'ml_engineer',
          complexity: 0.8,
          duration: 480, // 8 hours
          domain: 'data_science'
        }
      };

      // Perform capability matching
      const matchResult = await skillManager.matchCapabilities(matchingRequest);

      expect(matchResult.overallMatch).toBeGreaterThanOrEqual(0);
      expect(matchResult.overallMatch).toBeLessThanOrEqual(1);
      expect(matchResult.skillMatches).toHaveLength(3);
      expect(matchResult.strengths).toBeInstanceOf(Array);
      expect(matchResult.gaps).toBeInstanceOf(Array);
      expect(matchResult.recommendations).toBeInstanceOf(Array);
      expect(matchResult.riskAssessment.overallRisk).toBeGreaterThanOrEqual(0);

      // Verify skill matches
      const pythonMatch = matchResult.skillMatches.find(m => m.skillName === 'Python Programming');
      expect(pythonMatch).toBeDefined();
      expect(pythonMatch!.current).toBeGreaterThan(0.75); // Should be close to requirement
      expect(pythonMatch!.gap).toBeLessThan(0.1); // Small gap is acceptable

      const mlMatch = matchResult.skillMatches.find(m => m.skillName === 'Machine Learning');
      expect(mlMatch).toBeDefined();
      expect(mlMatch!.gap).toBeGreaterThan(0); // Should have a gap

      const vizMatch = matchResult.skillMatches.find(m => m.skillName === 'Data Visualization');
      expect(vizMatch).toBeDefined();
      expect(vizMatch!.current).toBe(0); // No experience
      expect(vizMatch!.gap).toBe(0.7); // Full gap
    });
  });

  describe('Skill Analytics and Pattern Recognition', () => {
    it('should generate comprehensive skill analytics', async () => {
      const agentId = 'test-agent-analytics';

      // Create multiple skill assessments over time
      const skills = [
        {
          skillId: 'problem_solving',
          skillName: 'Problem Solving',
          category: 'cognitive',
          proficiency: 0.75
        },
        {
          skillId: 'critical_thinking',
          skillName: 'Critical Thinking',
          category: 'cognitive',
          proficiency: 0.82
        },
        {
          skillId: 'teamwork',
          skillName: 'Teamwork',
          category: 'soft_skills',
          proficiency: 0.68
        }
      ];

      for (const skill of skills) {
        await skillManager.assessSkill({
          agentId,
          skillId: skill.skillId,
          skillName: skill.skillName,
          category: skill.category,
          subcategory: 'general',
          domain: 'general',
          context: {
            taskType: 'assessment',
            complexity: 0.6,
            duration: 60,
            outcome: 'successful' as const
          },
          performance: {
            accuracy: skill.proficiency,
            efficiency: skill.proficiency,
            quality: skill.proficiency
          },
          environment: {
            pressure: 'medium' as const,
            support: 'moderate' as const,
            resources: 'adequate' as const,
            timeConstraints: 'moderate' as const
          }
        });
      }

      // Generate analytics
      const analytics = await skillManager.analyzeSkillPatterns(agentId, 30);

      expect(analytics.proficiencyDistribution).toBeDefined();
      expect(analytics.learningMetrics).toBeDefined();
      expect(analytics.performanceMetrics).toBeDefined();
      expect(analytics.gapAnalysis).toBeDefined();
      expect(analytics.recommendations).toBeDefined();

      // Verify proficiency distribution
      const distribution = analytics.proficiencyDistribution;
      expect(distribution.beginner + distribution.intermediate + distribution.advanced + distribution.expert).toBeGreaterThan(0);

      // Verify learning metrics
      expect(analytics.learningMetrics.skillsInDevelopment).toBeGreaterThanOrEqual(0);
      expect(analytics.learningMetrics.totalPracticeHours).toBeGreaterThan(0);

      // Verify recommendations
      expect(analytics.recommendations.focusAreas).toBeInstanceOf(Array);
      expect(analytics.recommendations.nextSteps).toBeInstanceOf(Array);
    });

    it('should track skill proficiency updates over time', async () => {
      const agentId = 'test-agent-updates';
      const skillId = 'leadership';

      // Initial assessment
      await skillManager.assessSkill({
        agentId,
        skillId,
        skillName: 'Leadership',
        category: 'soft_skills',
        subcategory: 'management',
        domain: 'general',
        context: {
          taskType: 'team_management',
          complexity: 0.5,
          duration: 120,
          outcome: 'successful' as const
        },
        performance: {
          accuracy: 0.70,
          efficiency: 0.65,
          quality: 0.75
        },
        environment: {
          pressure: 'medium' as const,
          support: 'moderate' as const,
          resources: 'adequate' as const,
          timeConstraints: 'moderate' as const
        }
      });

      // Update proficiency
      await skillManager.updateSkillProficiency(agentId, skillId, {
        newProficiency: 0.85,
        evidence: 'Successfully led cross-functional team project',
        context: 'Project management with stakeholder coordination'
      });

      // Verify update
      const updatedSkills = await skillCollection.getAgentSkills(agentId, {
        'skill.id': skillId
      });

      expect(updatedSkills.length).toBeGreaterThan(0);
      const latestSkill = updatedSkills.sort((a, b) =>
        new Date(b.proficiency.lastAssessed).getTime() - new Date(a.proficiency.lastAssessed).getTime()
      )[0];

      expect(latestSkill.proficiency.current).toBe(0.85);
      expect(latestSkill.proficiency.assessmentHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle uninitialized manager gracefully', async () => {
      const uninitializedManager = new SkillCapabilityManager(db);

      await expect(uninitializedManager.assessSkill({
        agentId: 'test',
        skillId: 'test',
        skillName: 'Test',
        category: 'test',
        subcategory: 'test',
        domain: 'test',
        context: {
          taskType: 'test',
          complexity: 0.5,
          duration: 60,
          outcome: 'successful' as const
        },
        performance: {
          accuracy: 0.8,
          efficiency: 0.8,
          quality: 0.8
        },
        environment: {
          pressure: 'medium' as const,
          support: 'moderate' as const,
          resources: 'adequate' as const,
          timeConstraints: 'moderate' as const
        }
      })).rejects.toThrow('SkillCapabilityManager must be initialized first');
    });
  });
});
