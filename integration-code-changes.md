# 🔧 **INTEGRATION CODE CHANGES**

This document contains all the exact code changes needed to integrate the 6 missing cognitive systems.

## **📦 PHASE 1: WORKINGMEMORYMANAGER & MEMORYDECAYENGINE**

### **File 1: packages/core/src/UniversalAIBrain.ts**

#### **Import Additions (Line ~48)**
```typescript
// Add these imports after the existing intelligence imports
import { WorkingMemoryManager } from './intelligence/WorkingMemoryManager';
import { MemoryDecayEngine } from './intelligence/MemoryDecayEngine';
```

#### **Property Declarations (Line ~232, after _humanFeedbackIntegrationEngine)**
```typescript
// Working Memory and Decay Systems
private _workingMemoryManager!: WorkingMemoryManager;
private _memoryDecayEngine!: MemoryDecayEngine;
```

#### **Initialization (Line ~908, after HumanFeedbackIntegrationEngine initialization)**
```typescript
// Initialize Working Memory Manager
this._workingMemoryManager = new WorkingMemoryManager(
  this.database,
  this.semanticMemoryEngine
);
await this._workingMemoryManager.initialize();

// Initialize Memory Decay Engine
this._memoryDecayEngine = new MemoryDecayEngine(this.database);
await this._memoryDecayEngine.initialize();
```

#### **Public Getters (Line ~1185, after humanFeedbackIntegration getter)**
```typescript
/**
 * Access to Working Memory Manager
 */
get workingMemory() {
  return this._workingMemoryManager;
}

/**
 * Access to Memory Decay Engine
 */
get memoryDecay() {
  return this._memoryDecayEngine;
}
```

---

## **📦 PHASE 2: COLLECTION MANAGER UPDATES**

### **File 1: packages/core/src/collections/index.ts**

#### **Export Additions (Line ~28, after TemporalPlanCollection)**
```typescript
// Advanced Cognitive Collections
export { AnalogicalMappingCollection } from './AnalogicalMappingCollection';
export { CausalRelationshipCollection } from './CausalRelationshipCollection';
export { SocialIntelligenceCollection } from './SocialIntelligenceCollection';
export { EpisodicMemoryCollection } from './EpisodicMemoryCollection';
```

#### **Import Additions in CollectionManager (Line ~132, after CulturalKnowledgeCollection)**
```typescript
import { AnalogicalMappingCollection } from './AnalogicalMappingCollection';
import { CausalRelationshipCollection } from './CausalRelationshipCollection';
import { SocialIntelligenceCollection } from './SocialIntelligenceCollection';
import { EpisodicMemoryCollection } from './EpisodicMemoryCollection';
```

#### **Property Declarations (Line ~151, after culturalKnowledge)**
```typescript
// Advanced cognitive collection instances
public analogicalMappings: AnalogicalMappingCollection;
public causalRelationships: CausalRelationshipCollection;
public socialIntelligence: SocialIntelligenceCollection;
public episodicMemories: EpisodicMemoryCollection;
```

#### **Initialization (Line ~170, after culturalKnowledge initialization)**
```typescript
// Initialize advanced cognitive collections
this.analogicalMappings = new AnalogicalMappingCollection(db);
this.causalRelationships = new CausalRelationshipCollection(db);
this.socialIntelligence = new SocialIntelligenceCollection(db);
this.episodicMemories = new EpisodicMemoryCollection(db);
```

#### **Index Creation (Line ~193, after culturalKnowledge.createIndexes())**
```typescript
this.analogicalMappings.createIndexes(),
this.causalRelationships.createIndexes(),
this.socialIntelligence.createIndexes(),
this.episodicMemories.createIndexes()
```

---

## **📦 PHASE 2: ANALOGICAL, CAUSAL, SOCIAL SYSTEMS**

### **File 1: packages/core/src/UniversalAIBrain.ts**

#### **Import Additions (Line ~50, after MemoryDecayEngine)**
```typescript
// Advanced Cognitive Systems
import { AnalogicalMappingSystem } from './intelligence/AnalogicalMappingSystem';
import { CausalReasoningEngine } from './intelligence/CausalReasoningEngine';
import { SocialIntelligenceEngine } from './intelligence/SocialIntelligenceEngine';
```

#### **Property Declarations (Line ~235, after _memoryDecayEngine)**
```typescript
// Advanced Cognitive Systems
private _analogicalMappingSystem!: AnalogicalMappingSystem;
private _causalReasoningEngine!: CausalReasoningEngine;
private _socialIntelligenceEngine!: SocialIntelligenceEngine;
```

#### **Initialization (Line ~916, after MemoryDecayEngine initialization)**
```typescript
// Initialize Advanced Cognitive Systems
this._analogicalMappingSystem = new AnalogicalMappingSystem(this.database);
await this._analogicalMappingSystem.initialize();

this._causalReasoningEngine = new CausalReasoningEngine(this.database);
await this._causalReasoningEngine.initialize();

this._socialIntelligenceEngine = new SocialIntelligenceEngine(this.database);
await this._socialIntelligenceEngine.initialize();
```

#### **Public Getters (Line ~1197, after memoryDecay getter)**
```typescript
/**
 * Access to Analogical Mapping System
 */
get analogicalMapping() {
  return this._analogicalMappingSystem;
}

/**
 * Access to Causal Reasoning Engine
 */
get causalReasoning() {
  return this._causalReasoningEngine;
}

/**
 * Access to Social Intelligence Engine
 */
get socialIntelligence() {
  return this._socialIntelligenceEngine;
}
```

---

## **📦 PHASE 3: EPISODIC MEMORY ENGINE**

### **File 1: packages/core/src/UniversalAIBrain.ts**

#### **Import Addition (Line ~53, after SocialIntelligenceEngine)**
```typescript
import { EpisodicMemoryEngine } from './intelligence/EpisodicMemoryEngine';
```

#### **Property Declaration (Line ~238, after _socialIntelligenceEngine)**
```typescript
// Episodic Memory System
private _episodicMemoryEngine!: EpisodicMemoryEngine;
```

#### **Initialization (Line ~928, after SocialIntelligenceEngine initialization)**
```typescript
// Initialize Episodic Memory Engine (after other memory systems)
this._episodicMemoryEngine = new EpisodicMemoryEngine(this.database);
await this._episodicMemoryEngine.initialize();
```

#### **Public Getter (Line ~1215, after socialIntelligence getter)**
```typescript
/**
 * Access to Episodic Memory Engine
 */
get episodicMemory() {
  return this._episodicMemoryEngine;
}
```

---

## **🧪 TESTING COMMANDS**

### **Phase 1 Test**
```bash
npx ts-node phase1-integration-test.ts
```

### **Phase 2 Test**
```bash
npx ts-node phase2-integration-test.ts
```

### **Phase 3 Test**
```bash
npx ts-node phase3-integration-test.ts
```

### **Complete Integration**
```bash
npx ts-node master-integration-script.ts
```

### **Baseline Health Check**
```bash
npx ts-node baseline-system-test.ts
```

---

## **🔄 ROLLBACK PROCEDURES**

### **Phase 1 Rollback**
1. Remove WorkingMemoryManager and MemoryDecayEngine imports
2. Remove property declarations
3. Remove initialization code
4. Remove public getters
5. Test that original 12 systems still work

### **Phase 2 Rollback**
1. Revert CollectionManager changes
2. Remove advanced system imports
3. Remove property declarations
4. Remove initialization code
5. Remove public getters
6. Test that Phase 1 systems still work

### **Phase 3 Rollback**
1. Remove EpisodicMemoryEngine import
2. Remove property declaration
3. Remove initialization code
4. Remove public getter
5. Test that all other 17 systems still work

---

## **✅ SUCCESS VERIFICATION**

After each phase, verify:

1. **System Count**: Check that the expected number of systems are accessible
2. **No Conflicts**: Ensure existing systems still work
3. **Performance**: Monitor memory usage and response times
4. **Database**: Verify collections are created and indexed
5. **Operations**: Test basic operations for each new system

**Final Success**: All 18 cognitive systems accessible and functional with no conflicts or performance degradation.
