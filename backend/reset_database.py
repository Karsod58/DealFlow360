"""
Reset database - Drop all tables and recreate with new schema
"""
from app.database import Base, engine
from app import models

print("=" * 60)
print("WARNING: This will DROP ALL TABLES and data!")
print("=" * 60)

response = input("\nType 'yes' to proceed: ")

if response.lower() == 'yes':
    print("\n🗑️  Dropping all tables...")
    
    # Use raw SQL to drop all tables with CASCADE
    from sqlalchemy import text
    with engine.connect() as conn:
        # Drop all tables with CASCADE to handle dependencies
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.commit()
    
    print("✅ All tables dropped")
    
    print("\n🔨 Creating all tables with new schema...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created")
    
    print("\n✅ Database reset complete!")
    print("   Run 'python seed_database.py' to populate with test data")
else:
    print("\n❌ Database reset cancelled")
