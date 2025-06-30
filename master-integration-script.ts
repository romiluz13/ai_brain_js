/**
 * Master Integration Script
 * 
 * Orchestrates the complete integration of 6 missing cognitive systems
 * into the Universal AI Brain following the comprehensive integration plan.
 */

import { runBaselineSystemTest } from './baseline-system-test';
import { runPhase1IntegrationTest } from './phase1-integration-test';
import { runPhase2IntegrationTest } from './phase2-integration-test';
import { runPhase3IntegrationTest } from './phase3-integration-test';

interface MasterIntegrationResult {
  baseline: {
    passed: boolean;
    error?: string;
  };
  phase1: {
    passed: boolean;
    systemsIntegrated: string[];
    error?: string;
  };
  phase2: {
    passed: boolean;
    systemsIntegrated: string[];
    error?: string;
  };
  phase3: {
    passed: boolean;
    systemsIntegrated: string[];
    error?: string;
  };
  overall: {
    success: boolean;
    totalSystemsIntegrated: number;
    finalSystemCount: number;
    issues: string[];
    completionTime: number;
  };
}

async function runMasterIntegration(): Promise<MasterIntegrationResult> {
  const result: MasterIntegrationResult = {
    baseline: { passed: false },
    phase1: { passed: false, systemsIntegrated: [] },
    phase2: { passed: false, systemsIntegrated: [] },
    phase3: { passed: false, systemsIntegrated: [] },
    overall: {
      success: false,
      totalSystemsIntegrated: 0,
      finalSystemCount: 12, // Starting with 12 systems
      issues: [],
      completionTime: 0
    }
  };

  const startTime = Date.now();

  console.log('🚀 MASTER INTEGRATION SCRIPT STARTING');
  console.log('🎯 Goal: Integrate 6 missing cognitive systems into Universal AI Brain');
  console.log('📊 Current: 12 systems → Target: 18 systems\n');

  try {
    // STEP 1: Baseline System Health Check
    console.log('=' .repeat(80));
    console.log('🔍 STEP 1: BASELINE SYSTEM HEALTH CHECK');
    console.log('=' .repeat(80));
    
    try {
      const baselineResult = await runBaselineSystemTest();
      result.baseline.passed = baselineResult.overall.readyForIntegration;
      
      if (!result.baseline.passed) {
        result.baseline.error = 'Baseline system health check failed';
        result.overall.issues.push('Baseline system not ready for integration');
        console.log('❌ BASELINE CHECK FAILED - STOPPING INTEGRATION');
        return result;
      }
      
      console.log('✅ BASELINE CHECK PASSED - PROCEEDING TO PHASE 1\n');
    } catch (error) {
      result.baseline.error = error instanceof Error ? error.message : 'Unknown baseline error';
      result.overall.issues.push(`Baseline: ${result.baseline.error}`);
      console.error('❌ BASELINE CHECK ERROR:', error);
      return result;
    }

    // STEP 2: Phase 1 Integration (Low Risk)
    console.log('=' .repeat(80));
    console.log('🔧 STEP 2: PHASE 1 INTEGRATION (LOW RISK)');
    console.log('🎯 Integrating: WorkingMemoryManager, MemoryDecayEngine');
    console.log('=' .repeat(80));
    
    try {
      const phase1Result = await runPhase1IntegrationTest();
      result.phase1.passed = phase1Result.overall.phase1Ready;
      
      if (result.phase1.passed) {
        result.phase1.systemsIntegrated = ['WorkingMemoryManager', 'MemoryDecayEngine'];
        result.overall.finalSystemCount += 2;
        result.overall.totalSystemsIntegrated += 2;
        console.log('✅ PHASE 1 PASSED - PROCEEDING TO PHASE 2\n');
      } else {
        result.phase1.error = 'Phase 1 integration failed';
        result.overall.issues.push('Phase 1 systems failed to integrate properly');
        console.log('❌ PHASE 1 FAILED - STOPPING INTEGRATION');
        return result;
      }
    } catch (error) {
      result.phase1.error = error instanceof Error ? error.message : 'Unknown Phase 1 error';
      result.overall.issues.push(`Phase 1: ${result.phase1.error}`);
      console.error('❌ PHASE 1 ERROR:', error);
      return result;
    }

    // STEP 3: Phase 2 Integration (Medium Risk)
    console.log('=' .repeat(80));
    console.log('🔧 STEP 3: PHASE 2 INTEGRATION (MEDIUM RISK)');
    console.log('🎯 Integrating: AnalogicalMappingSystem, CausalReasoningEngine, SocialIntelligenceEngine');
    console.log('=' .repeat(80));
    
    try {
      const phase2Result = await runPhase2IntegrationTest();
      result.phase2.passed = phase2Result.overall.phase2Ready;
      
      if (result.phase2.passed) {
        result.phase2.systemsIntegrated = ['AnalogicalMappingSystem', 'CausalReasoningEngine', 'SocialIntelligenceEngine'];
        result.overall.finalSystemCount += 3;
        result.overall.totalSystemsIntegrated += 3;
        console.log('✅ PHASE 2 PASSED - PROCEEDING TO PHASE 3\n');
      } else {
        result.phase2.error = 'Phase 2 integration failed';
        result.overall.issues.push('Phase 2 systems failed to integrate properly');
        console.log('❌ PHASE 2 FAILED - STOPPING INTEGRATION');
        return result;
      }
    } catch (error) {
      result.phase2.error = error instanceof Error ? error.message : 'Unknown Phase 2 error';
      result.overall.issues.push(`Phase 2: ${result.phase2.error}`);
      console.error('❌ PHASE 2 ERROR:', error);
      return result;
    }

    // STEP 4: Phase 3 Integration (High Risk)
    console.log('=' .repeat(80));
    console.log('🔧 STEP 4: PHASE 3 INTEGRATION (HIGH RISK)');
    console.log('🎯 Integrating: EpisodicMemoryEngine');
    console.log('=' .repeat(80));
    
    try {
      const phase3Result = await runPhase3IntegrationTest();
      result.phase3.passed = phase3Result.overall.integrationComplete;
      
      if (result.phase3.passed) {
        result.phase3.systemsIntegrated = ['EpisodicMemoryEngine'];
        result.overall.finalSystemCount += 1;
        result.overall.totalSystemsIntegrated += 1;
        result.overall.success = true;
        console.log('✅ PHASE 3 PASSED - INTEGRATION COMPLETE!\n');
      } else {
        result.phase3.error = 'Phase 3 integration failed';
        result.overall.issues.push('Phase 3 system failed to integrate properly');
        console.log('❌ PHASE 3 FAILED - INTEGRATION INCOMPLETE');
        return result;
      }
    } catch (error) {
      result.phase3.error = error instanceof Error ? error.message : 'Unknown Phase 3 error';
      result.overall.issues.push(`Phase 3: ${result.phase3.error}`);
      console.error('❌ PHASE 3 ERROR:', error);
      return result;
    }

  } catch (error) {
    result.overall.issues.push(`Master Integration: ${error}`);
    console.error('❌ MASTER INTEGRATION ERROR:', error);
  } finally {
    result.overall.completionTime = Date.now() - startTime;
  }

  return result;
}

function printFinalReport(result: MasterIntegrationResult): void {
  console.log('\n' + '=' .repeat(80));
  console.log('🎉 MASTER INTEGRATION FINAL REPORT');
  console.log('=' .repeat(80));
  
  console.log('\n📊 INTEGRATION SUMMARY:');
  console.log(`Baseline Check: ${result.baseline.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Phase 1 (Low Risk): ${result.phase1.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Phase 2 (Medium Risk): ${result.phase2.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Phase 3 (High Risk): ${result.phase3.passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('\n🧠 COGNITIVE SYSTEMS INTEGRATED:');
  if (result.phase1.systemsIntegrated.length > 0) {
    console.log('Phase 1:');
    result.phase1.systemsIntegrated.forEach(system => console.log(`  ✅ ${system}`));
  }
  if (result.phase2.systemsIntegrated.length > 0) {
    console.log('Phase 2:');
    result.phase2.systemsIntegrated.forEach(system => console.log(`  ✅ ${system}`));
  }
  if (result.phase3.systemsIntegrated.length > 0) {
    console.log('Phase 3:');
    result.phase3.systemsIntegrated.forEach(system => console.log(`  ✅ ${system}`));
  }
  
  console.log('\n📈 FINAL STATISTICS:');
  console.log(`Starting Systems: 12`);
  console.log(`Systems Integrated: ${result.overall.totalSystemsIntegrated}`);
  console.log(`Final System Count: ${result.overall.finalSystemCount}`);
  console.log(`Integration Time: ${Math.round(result.overall.completionTime / 1000)} seconds`);
  
  if (result.overall.success) {
    console.log('\n🎉 INTEGRATION SUCCESSFUL!');
    console.log('🧠 Universal AI Brain now has 18 cognitive systems!');
    console.log('🚀 You have achieved Universal AI Brain 3.0 level functionality!');
    console.log('\n🎯 WHAT YOU NOW HAVE:');
    console.log('  ✅ 8 Core Cognitive Systems');
    console.log('  ✅ 4 Enhanced AI Brain 2.0 Systems');
    console.log('  ✅ 6 Advanced Cognitive Systems (newly integrated)');
    console.log('  ✅ Complete MongoDB Atlas optimization');
    console.log('  ✅ Production-ready cognitive architecture');
    console.log('  ✅ Most advanced AI brain available');
  } else {
    console.log('\n⚠️  INTEGRATION INCOMPLETE');
    console.log('🔧 Issues that need to be resolved:');
    result.overall.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review the specific error messages above');
    console.log('2. Fix the identified issues');
    console.log('3. Re-run the integration from the failed phase');
    console.log('4. Use the rollback procedures if needed');
  }
  
  console.log('\n' + '=' .repeat(80));
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log('🧠 Universal AI Brain - Master Integration Script');
    console.log('🎯 Integrating 6 missing cognitive systems...\n');
    
    const result = await runMasterIntegration();
    printFinalReport(result);
    
    process.exit(result.overall.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Master integration script failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { runMasterIntegration, MasterIntegrationResult };

// Run if executed directly
if (require.main === module) {
  main();
}
